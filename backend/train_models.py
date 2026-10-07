import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
import shap

# 1. Load Data
dataset_path = r"D:\cardio\data\extention+of+z+alizadeh+sani+dataset\extention of Z-Alizadeh sani dataset.xlsx"
df = pd.read_excel(dataset_path, sheet_name=0)

print(f"Loaded dataset with shape: {df.shape}")

# 2. Extract Targets
y_dict = {
    'CAD': (df['Cath'].astype(str).str.strip().str.upper() == 'CAD').astype(int),
    'LAD': (df['LAD'].astype(str).str.strip().str.upper() == 'STENOTIC').astype(int),
    'LCX': (df['LCX'].astype(str).str.strip().str.upper() == 'STENOTIC').astype(int),
    'RCA': (df['RCA'].astype(str).str.strip().str.upper() == 'STENOTIC').astype(int),
}

targets_df = pd.DataFrame(y_dict)
for col in targets_df.columns:
    pos_count = targets_df[col].sum()
    print(f"Target '{col}': {pos_count} positive ({pos_count/len(df)*100:.1f}%), {len(df)-pos_count} negative")

# 3. Anti-leakage: Drop all targets and 'Cath' from features
leakage_cols = ['Cath', 'LAD', 'LCX', 'RCA', 'CAD']
X_raw = df.drop(columns=[c for c in leakage_cols if c in df.columns]).copy()
print(f"Features remaining after anti-leakage drop: {X_raw.shape[1]}")

# 4. Feature Encoding & Mapping
# Identify columns and standardize
binary_yn_cols = []
other_cat_cols = []

# Map Sex to 1 (Male), 0 (Female)
if 'Sex' in X_raw.columns:
    X_raw['Sex'] = X_raw['Sex'].astype(str).str.strip().map(lambda s: 1 if 'M' in s.upper() else 0)

for c in X_raw.select_dtypes(include=['object']).columns:
    unique_vals = set(X_raw[c].dropna().astype(str).str.strip().unique())
    if unique_vals.issubset({'Y', 'N', 'y', 'n'}):
        binary_yn_cols.append(c)
        X_raw[c] = X_raw[c].astype(str).str.strip().str.upper().map({'Y': 1, 'N': 0}).fillna(0).astype(int)
    else:
        other_cat_cols.append(c)

print(f"Binary Y/N columns converted: {len(binary_yn_cols)}")
print(f"Other categorical columns: {other_cat_cols}")

# Process multi-class categorical columns (e.g. BBB, VHD)
# BBB: 'N', 'LBBB', 'RBBB'
# VHD: 'N', 'mild', 'Moderate', 'Severe'
if 'VHD' in X_raw.columns:
    # Ordinal mapping for severity
    vhd_map = {'N': 0, 'mild': 1, 'Moderate': 2, 'Severe': 3}
    X_raw['VHD'] = X_raw['VHD'].astype(str).str.strip().map(lambda v: vhd_map.get(v, 0))

if 'BBB' in X_raw.columns:
    # One-hot encode BBB
    bbb_dummies = pd.get_dummies(X_raw['BBB'], prefix='BBB', drop_first=False, dtype=int)
    X_raw = pd.concat([X_raw.drop(columns=['BBB']), bbb_dummies], axis=1)

# Ensure all features are numeric
X_processed = X_raw.astype(float)
feature_names = list(X_processed.columns)
print(f"Total processed features: {len(feature_names)}")

# Save processed feature list and stats for frontend form generation
feature_metadata = {}
for col in feature_names:
    series = X_processed[col]
    feature_metadata[col] = {
        'name': col,
        'min': float(series.min()),
        'max': float(series.max()),
        'mean': float(series.mean()),
        'median': float(series.median()),
        'std': float(series.std()),
        'is_binary': bool(series.nunique() <= 2 and set(series.unique()).issubset({0.0, 1.0})),
        'unique_values': [float(x) for x in sorted(series.unique())] if series.nunique() <= 5 else []
    }

# 5. Model Evaluation and Selection with 5-Fold Stratified Cross-Validation
candidate_models = {
    'XGBoost': lambda: XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42, eval_metric='logloss'),
    'LightGBM': lambda: LGBMClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42, verbose=-1),
    'RandomForest': lambda: RandomForestClassifier(n_estimators=150, max_depth=5, random_state=42),
    'GradientBoosting': lambda: GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42)
}

cv_results = {}
best_models_dict = {}

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for target_name in ['CAD', 'LAD', 'LCX', 'RCA']:
    y = targets_df[target_name].values
    print(f"\n--- Evaluating Models for Target: {target_name} ---")
    cv_results[target_name] = {}
    best_f1 = -1
    best_algo_name = None
    
    for algo_name, model_fn in candidate_models.items():
        accs, precs, recs, f1s, aucs = [], [], [], [], []
        
        for train_idx, test_idx in skf.split(X_processed, y):
            X_tr, X_val = X_processed.iloc[train_idx], X_processed.iloc[test_idx]
            y_tr, y_val = y[train_idx], y[test_idx]
            
            m = model_fn()
            m.fit(X_tr, y_tr)
            
            preds = m.predict(X_val)
            probs = m.predict_proba(X_val)[:, 1] if hasattr(m, 'predict_proba') else preds
            
            accs.append(accuracy_score(y_val, preds))
            precs.append(precision_score(y_val, preds, zero_division=0))
            recs.append(recall_score(y_val, preds, zero_division=0))
            f1s.append(f1_score(y_val, preds, zero_division=0))
            aucs.append(roc_auc_score(y_val, probs))
            
        mean_metrics = {
            'accuracy': float(np.mean(accs)),
            'precision': float(np.mean(precs)),
            'recall': float(np.mean(recs)),
            'f1': float(np.mean(f1s)),
            'roc_auc': float(np.mean(aucs))
        }
        cv_results[target_name][algo_name] = mean_metrics
        print(f"  {algo_name:<16} | Acc: {mean_metrics['accuracy']:.4f} | F1: {mean_metrics['f1']:.4f} | ROC-AUC: {mean_metrics['roc_auc']:.4f} | Rec: {mean_metrics['recall']:.4f} | Prec: {mean_metrics['precision']:.4f}")
        
        # Select best model balancing ROC-AUC and F1
        score = (mean_metrics['roc_auc'] + mean_metrics['f1']) / 2.0
        if score > best_f1:
            best_f1 = score
            best_algo_name = algo_name
            
    print(f"  >>> Best model for {target_name}: {best_algo_name} (Combined score: {best_f1:.4f})")
    
    # Fit final production model on full dataset
    final_model = candidate_models[best_algo_name]()
    final_model.fit(X_processed, y)
    best_models_dict[target_name] = {
        'model': final_model,
        'algorithm': best_algo_name,
        'metrics': cv_results[target_name][best_algo_name]
    }

# 6. SHAP Explainers
print("\n--- Generating SHAP Explainers ---")
shap_explainers = {}
global_feature_importances = {}

for target_name in ['CAD', 'LAD', 'LCX', 'RCA']:
    model_obj = best_models_dict[target_name]['model']
    explainer = shap.TreeExplainer(model_obj)
    shap_explainers[target_name] = explainer
    
    # Calculate global SHAP values
    shap_values = explainer.shap_values(X_processed)
    if isinstance(shap_values, list):
        # For binary classification some models return list of 2 arrays [class0, class1]
        shap_vals_matrix = np.abs(shap_values[1])
    elif len(shap_values.shape) == 3:
        shap_vals_matrix = np.abs(shap_values[:, :, 1])
    else:
        shap_vals_matrix = np.abs(shap_values)
        
    mean_abs_shap = np.mean(shap_vals_matrix, axis=0)
    importance_ranking = sorted(
        [{'feature': feat, 'importance': float(imp)} for feat, imp in zip(feature_names, mean_abs_shap)],
        key=lambda x: x['importance'],
        reverse=True
    )
    global_feature_importances[target_name] = importance_ranking[:15]
    print(f"Top 5 features for {target_name}: {[f['feature'] for f in importance_ranking[:5]]}")

# 7. Curate Sample Preset Patients
print("\n--- Curating Sample Patients for UI Testing ---")
sample_patients = []

# Case 1: Healthy / Very Low Risk Patient (Cath=Normal, all vessels Normal)
healthy_mask = (targets_df['CAD'] == 0) & (targets_df['LAD'] == 0) & (targets_df['LCX'] == 0) & (targets_df['RCA'] == 0)
if healthy_mask.any():
    idx_h = targets_df[healthy_mask].index[0]
    sample_patients.append({
        'id': 'patient_healthy',
        'name': 'Low Risk / Asymptomatic (Case A)',
        'description': 'Normal coronaries, preserved ejection fraction, no regional wall motion abnormalities.',
        'ground_truth': {'CAD': 0, 'LAD': 0, 'LCX': 0, 'RCA': 0},
        'features': X_processed.iloc[idx_h].to_dict()
    })

# Case 2: Multi-Vessel Severe CAD (CAD=1, LAD=1, LCX=1, RCA=1)
multi_mask = (targets_df['CAD'] == 1) & (targets_df['LAD'] == 1) & (targets_df['LCX'] == 1) & (targets_df['RCA'] == 1)
if multi_mask.any():
    idx_m = targets_df[multi_mask].index[0]
    sample_patients.append({
        'id': 'patient_multivessel',
        'name': 'Triple-Vessel Severe CAD (Case B)',
        'description': 'Critical multi-vessel disease with significant stenosis in LAD, LCX, and RCA.',
        'ground_truth': {'CAD': 1, 'LAD': 1, 'LCX': 1, 'RCA': 1},
        'features': X_processed.iloc[idx_m].to_dict()
    })

# Case 3: Isolated LAD Stenosis (CAD=1, LAD=1, LCX=0, RCA=0)
lad_mask = (targets_df['CAD'] == 1) & (targets_df['LAD'] == 1) & (targets_df['LCX'] == 0) & (targets_df['RCA'] == 0)
if lad_mask.any():
    idx_lad = targets_df[lad_mask].index[0]
    sample_patients.append({
        'id': 'patient_isolated_lad',
        'name': 'Isolated Anterior Stenosis - LAD (Case C)',
        'description': 'Isolated significant stenosis in the Left Anterior Descending artery.',
        'ground_truth': {'CAD': 1, 'LAD': 1, 'LCX': 0, 'RCA': 0},
        'features': X_processed.iloc[idx_lad].to_dict()
    })

# Case 4: Isolated RCA Stenosis (CAD=1, LAD=0, LCX=0, RCA=1)
rca_mask = (targets_df['CAD'] == 1) & (targets_df['LAD'] == 0) & (targets_df['LCX'] == 0) & (targets_df['RCA'] == 1)
if rca_mask.any():
    idx_rca = targets_df[rca_mask].index[0]
    sample_patients.append({
        'id': 'patient_isolated_rca',
        'name': 'Isolated Inferior Stenosis - RCA (Case D)',
        'description': 'Predominant right coronary artery involvement.',
        'ground_truth': {'CAD': 1, 'LAD': 0, 'LCX': 0, 'RCA': 1},
        'features': X_processed.iloc[idx_rca].to_dict()
    })

# 8. Save Models and Metadata
output_dir = r"D:\cardio\backend\models"
os.makedirs(output_dir, exist_ok=True)

for target_name, data in best_models_dict.items():
    model_file = os.path.join(output_dir, f"{target_name.lower()}_model.pkl")
    joblib.dump(data['model'], model_file)
    print(f"Saved {model_file}")

with open(os.path.join(output_dir, "metrics_summary.json"), "w") as f:
    json.dump({
        'cv_results': cv_results,
        'best_models': {t: {'algorithm': best_models_dict[t]['algorithm'], 'metrics': best_models_dict[t]['metrics']} for t in best_models_dict}
    }, f, indent=2)

with open(os.path.join(output_dir, "feature_metadata.json"), "w") as f:
    json.dump({
        'feature_names': feature_names,
        'features': feature_metadata
    }, f, indent=2)

with open(os.path.join(output_dir, "sample_patients.json"), "w") as f:
    json.dump(sample_patients, f, indent=2)

with open(os.path.join(output_dir, "global_importance.json"), "w") as f:
    json.dump(global_feature_importances, f, indent=2)

# Save processed dataframe for reference
X_processed.to_csv(r"D:\cardio\data\processed\X_processed.csv", index=False)
targets_df.to_csv(r"D:\cardio\data\processed\y_targets.csv", index=False)

print("\nModel training and artifact generation successfully completed!")
