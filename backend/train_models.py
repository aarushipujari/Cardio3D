import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier, GradientBoostingClassifier
from lightgbm import LGBMClassifier
import shap

# 1. Resolve Dynamic Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "backend", "models")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

# 2. Load Processed Dataset
x_csv_path = os.path.join(PROCESSED_DATA_DIR, "X_processed.csv")
y_csv_path = os.path.join(PROCESSED_DATA_DIR, "y_targets.csv")

if os.path.exists(x_csv_path) and os.path.exists(y_csv_path):
    print("Loading preprocessed dataset from CSV...")
    X_processed = pd.read_csv(x_csv_path)
    targets_df = pd.read_csv(y_csv_path)
else:
    print("Processing raw dataset from Excel...")
    raw_excel = os.path.join(BASE_DIR, "data", "extention+of+z+alizadeh+sani+dataset", "extention of Z-Alizadeh sani dataset.xlsx")
    df = pd.read_excel(raw_excel, sheet_name=0)
    
    y_dict = {
        'CAD': (df['Cath'].astype(str).str.strip().str.upper() == 'CAD').astype(int),
        'LAD': (df['LAD'].astype(str).str.strip().str.upper() == 'STENOTIC').astype(int),
        'LCX': (df['LCX'].astype(str).str.strip().str.upper() == 'STENOTIC').astype(int),
        'RCA': (df['RCA'].astype(str).str.strip().str.upper() == 'STENOTIC').astype(int),
    }
    targets_df = pd.DataFrame(y_dict)
    
    leakage_cols = ['Cath', 'LAD', 'LCX', 'RCA', 'CAD']
    X_raw = df.drop(columns=[c for c in leakage_cols if c in df.columns]).copy()
    
    if 'Sex' in X_raw.columns:
        X_raw['Sex'] = X_raw['Sex'].astype(str).str.strip().map(lambda s: 1 if 'M' in s.upper() else 0)
        
    for c in X_raw.select_dtypes(include=['object']).columns:
        unique_vals = set(X_raw[c].dropna().astype(str).str.strip().unique())
        if unique_vals.issubset({'Y', 'N', 'y', 'n'}):
            X_raw[c] = X_raw[c].astype(str).str.strip().str.upper().map({'Y': 1, 'N': 0}).fillna(0).astype(int)
            
    if 'VHD' in X_raw.columns:
        vhd_map = {'N': 0, 'mild': 1, 'Moderate': 2, 'Severe': 3}
        X_raw['VHD'] = X_raw['VHD'].astype(str).str.strip().map(lambda v: vhd_map.get(v, 0))
        
    if 'BBB' in X_raw.columns:
        bbb_dummies = pd.get_dummies(X_raw['BBB'], prefix='BBB', drop_first=False, dtype=int)
        X_raw = pd.concat([X_raw.drop(columns=['BBB']), bbb_dummies], axis=1)
        
    X_processed = X_raw.astype(float)
    X_processed.to_csv(x_csv_path, index=False)
    targets_df.to_csv(y_csv_path, index=False)

feature_names = list(X_processed.columns)
print(f"Features loaded: {len(feature_names)}, Samples: {len(X_processed)}")

for col in targets_df.columns:
    pos_count = int(targets_df[col].sum())
    print(f"Target '{col}': {pos_count} positive ({pos_count/len(targets_df)*100:.1f}%), {len(targets_df)-pos_count} negative")

# 3. Save feature metadata for frontend validation
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

# 4. Model Evaluation & Selection with Class Balancing & Threshold Calibration
candidate_models = {
    'BalancedRandomForest': lambda: RandomForestClassifier(n_estimators=180, max_depth=5, class_weight='balanced', random_state=42),
    'BalancedLightGBM': lambda: LGBMClassifier(n_estimators=120, max_depth=4, learning_rate=0.04, class_weight='balanced', random_state=42, verbose=-1),
    'HistGradientBoosting': lambda: HistGradientBoostingClassifier(max_iter=120, max_depth=4, class_weight='balanced', random_state=42),
    'GradientBoosting': lambda: GradientBoostingClassifier(n_estimators=120, max_depth=3, learning_rate=0.04, random_state=42)
}

cv_results = {}
best_models_dict = {}
optimal_thresholds = {}

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for target_name in ['CAD', 'LAD', 'LCX', 'RCA']:
    y = targets_df[target_name].values
    print(f"\n========================================================")
    print(f"--- Training & Calibrating Models for Target: {target_name} ---")
    print(f"========================================================")
    
    cv_results[target_name] = {}
    best_score = -1
    best_algo_name = None
    best_algo_threshold = 0.5
    
    for algo_name, model_fn in candidate_models.items():
        accs, precs, recs, f1s, aucs = [], [], [], [], []
        threshold_candidates = []
        
        for train_idx, test_idx in skf.split(X_processed, y):
            X_tr, X_val = X_processed.iloc[train_idx], X_processed.iloc[test_idx]
            y_tr, y_val = y[train_idx], y[test_idx]
            
            m = model_fn()
            m.fit(X_tr, y_tr)
            
            probs = m.predict_proba(X_val)[:, 1] if hasattr(m, 'predict_proba') else m.predict(X_val)
            
            # Find optimal threshold on validation fold to maximize F1 & Youden's J
            best_fold_t, best_fold_f1 = 0.5, 0.0
            for t in np.linspace(0.25, 0.65, 41):
                preds_t = (probs >= t).astype(int)
                f1_t = f1_score(y_val, preds_t, zero_division=0)
                rec_t = recall_score(y_val, preds_t, zero_division=0)
                combined = 0.6 * f1_t + 0.4 * rec_t
                if combined > best_fold_f1:
                    best_fold_f1 = combined
                    best_fold_t = t
            
            threshold_candidates.append(best_fold_t)
            
            # Evaluate using calibrated threshold
            final_preds = (probs >= best_fold_t).astype(int)
            accs.append(accuracy_score(y_val, final_preds))
            precs.append(precision_score(y_val, final_preds, zero_division=0))
            recs.append(recall_score(y_val, final_preds, zero_division=0))
            f1s.append(f1_score(y_val, final_preds, zero_division=0))
            aucs.append(roc_auc_score(y_val, probs))
            
        avg_thresh = float(np.mean(threshold_candidates))
        mean_metrics = {
            'accuracy': float(np.mean(accs)),
            'precision': float(np.mean(precs)),
            'recall': float(np.mean(recs)),
            'f1': float(np.mean(f1s)),
            'roc_auc': float(np.mean(aucs)),
            'calibrated_threshold': round(avg_thresh, 2)
        }
        cv_results[target_name][algo_name] = mean_metrics
        print(f"  {algo_name:<22} | Acc: {mean_metrics['accuracy']:.3f} | F1: {mean_metrics['f1']:.3f} | Rec: {mean_metrics['recall']:.3f} | AUC: {mean_metrics['roc_auc']:.3f} | Thresh: {mean_metrics['calibrated_threshold']}")
        
        # Balance AUC, Recall, and F1
        score = 0.4 * mean_metrics['roc_auc'] + 0.35 * mean_metrics['f1'] + 0.25 * mean_metrics['recall']
        if score > best_score:
            best_score = score
            best_algo_name = algo_name
            best_algo_threshold = avg_thresh
            
    print(f"  >>> Selected Champion for {target_name}: {best_algo_name} (Threshold: {best_algo_threshold:.2f}, Composite Score: {best_score:.4f})")
    
    # Fit final champion model on full dataset
    final_model = candidate_models[best_algo_name]()
    final_model.fit(X_processed, y)
    best_models_dict[target_name] = {
        'model': final_model,
        'algorithm': best_algo_name,
        'threshold': round(best_algo_threshold, 2),
        'metrics': cv_results[target_name][best_algo_name]
    }
    optimal_thresholds[target_name] = round(best_algo_threshold, 2)

# 5. SHAP Explainers
print("\n--- Generating SHAP Explainers & Feature Importance Rankings ---")
shap_explainers = {}
global_feature_importances = {}

for target_name in ['CAD', 'LAD', 'LCX', 'RCA']:
    model_obj = best_models_dict[target_name]['model']
    try:
        explainer = shap.TreeExplainer(model_obj)
        shap_explainers[target_name] = explainer
        shap_values = explainer.shap_values(X_processed)
        
        if isinstance(shap_values, list):
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
        print(f"Top 5 SHAP features for {target_name}: {[f['feature'] for f in importance_ranking[:5]]}")
    except Exception as e:
        print(f"SHAP note for {target_name}: {e}")
        # Fallback to feature_importances_ if TreeExplainer structure varies
        if hasattr(model_obj, 'feature_importances_'):
            imps = model_obj.feature_importances_
            importance_ranking = sorted(
                [{'feature': feat, 'importance': float(imp)} for feat, imp in zip(feature_names, imps)],
                key=lambda x: x['importance'],
                reverse=True
            )
            global_feature_importances[target_name] = importance_ranking[:15]

# 6. Sample Preset Patients for UI
sample_patients = []
healthy_mask = (targets_df['CAD'] == 0) & (targets_df['LAD'] == 0) & (targets_df['LCX'] == 0) & (targets_df['RCA'] == 0)
if healthy_mask.any():
    idx_h = targets_df[healthy_mask].index[0]
    sample_patients.append({
        'id': 'patient_healthy',
        'name': 'Low Risk / Normal Screen (Case A)',
        'description': 'Normal coronaries, preserved ejection fraction, no wall motion abnormalities.',
        'ground_truth': {'CAD': 0, 'LAD': 0, 'LCX': 0, 'RCA': 0},
        'features': X_processed.iloc[idx_h].to_dict()
    })

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

lad_mask = (targets_df['CAD'] == 1) & (targets_df['LAD'] == 1) & (targets_df['LCX'] == 0) & (targets_df['RCA'] == 0)
if lad_mask.any():
    idx_lad = targets_df[lad_mask].index[0]
    sample_patients.append({
        'id': 'patient_isolated_lad',
        'name': 'Isolated Anterior LAD Stenosis (Case C)',
        'description': 'Isolated significant stenosis in the Left Anterior Descending artery.',
        'ground_truth': {'CAD': 1, 'LAD': 1, 'LCX': 0, 'RCA': 0},
        'features': X_processed.iloc[idx_lad].to_dict()
    })

rca_mask = (targets_df['CAD'] == 1) & (targets_df['LAD'] == 0) & (targets_df['LCX'] == 0) & (targets_df['RCA'] == 1)
if rca_mask.any():
    idx_rca = targets_df[rca_mask].index[0]
    sample_patients.append({
        'id': 'patient_isolated_rca',
        'name': 'Isolated Inferior RCA Stenosis (Case D)',
        'description': 'Predominant right coronary artery involvement.',
        'ground_truth': {'CAD': 1, 'LAD': 0, 'LCX': 0, 'RCA': 1},
        'features': X_processed.iloc[idx_rca].to_dict()
    })

# 7. Persist Models and Metadata
print("\n--- Persisting Models, Thresholds, and Calibration Artifacts ---")
for target_name, data in best_models_dict.items():
    model_file = os.path.join(MODELS_DIR, f"{target_name.lower()}_model.pkl")
    joblib.dump(data['model'], model_file)
    print(f"Saved: {model_file}")

with open(os.path.join(MODELS_DIR, "thresholds.json"), "w") as f:
    json.dump(optimal_thresholds, f, indent=2)

with open(os.path.join(MODELS_DIR, "metrics_summary.json"), "w") as f:
    json.dump({
        'cv_results': cv_results,
        'best_models': {
            t: {
                'algorithm': best_models_dict[t]['algorithm'],
                'calibrated_threshold': best_models_dict[t]['threshold'],
                'metrics': best_models_dict[t]['metrics']
            } for t in best_models_dict
        }
    }, f, indent=2)

with open(os.path.join(MODELS_DIR, "feature_metadata.json"), "w") as f:
    json.dump({'feature_names': feature_names, 'features': feature_metadata}, f, indent=2)

with open(os.path.join(MODELS_DIR, "sample_patients.json"), "w") as f:
    json.dump(sample_patients, f, indent=2)

with open(os.path.join(MODELS_DIR, "global_importance.json"), "w") as f:
    json.dump(global_feature_importances, f, indent=2)

print("\nModel training and calibration successfully completed!")
