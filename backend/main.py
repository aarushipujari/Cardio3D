import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import shap

app = FastAPI(
    title="Cardio3D Risk Engine API",
    description="Multimodal Cardiovascular Risk Prediction & 3D Vessel Stenosis Mapping API",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Global containers
models = {}
shap_explainers = {}
feature_metadata = {}
feature_names = []
sample_patients = []
metrics_summary = {}
global_importance = {}

def load_artifacts():
    global models, shap_explainers, feature_metadata, feature_names, sample_patients, metrics_summary, global_importance
    
    # Check if models exist
    cad_model_path = os.path.join(MODELS_DIR, "cad_model.pkl")
    if not os.path.exists(cad_model_path):
        print("Warning: Model artifacts not found yet. Please run train_models.py.")
        return False
        
    for target in ['cad', 'lad', 'lcx', 'rca']:
        path = os.path.join(MODELS_DIR, f"{target}_model.pkl")
        if os.path.exists(path):
            m = joblib.load(path)
            models[target.upper()] = m
            # Initialize TreeExplainer
            try:
                shap_explainers[target.upper()] = shap.TreeExplainer(m)
            except Exception as e:
                print(f"Error creating SHAP explainer for {target}: {e}")

    # Load feature metadata
    meta_path = os.path.join(MODELS_DIR, "feature_metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            data = json.load(f)
            feature_names = data.get("feature_names", [])
            feature_metadata = data.get("features", {})

    # Load sample patients
    patients_path = os.path.join(MODELS_DIR, "sample_patients.json")
    if os.path.exists(patients_path):
        with open(patients_path, "r") as f:
            sample_patients = json.load(f)

    # Load metrics
    metrics_path = os.path.join(MODELS_DIR, "metrics_summary.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            metrics_summary = json.load(f)

    # Load global feature importance
    importance_path = os.path.join(MODELS_DIR, "global_importance.json")
    if os.path.exists(importance_path):
        with open(importance_path, "r") as f:
            global_importance = json.load(f)
            
    print(f"Successfully loaded {len(models)} models and metadata for {len(feature_names)} features.")
    return True

# Initialize on startup
load_artifacts()

class PredictionRequest(BaseModel):
    features: Dict[str, Any]

@app.get("/api/health")
def health_check():
    loaded = len(models) == 4
    return {
        "status": "healthy" if loaded else "initializing",
        "models_loaded": list(models.keys()),
        "features_count": len(feature_names)
    }

@app.get("/api/metrics")
def get_metrics():
    if not metrics_summary:
        load_artifacts()
    return metrics_summary

@app.get("/api/features")
def get_features():
    if not feature_metadata:
        load_artifacts()
    return {
        "feature_names": feature_names,
        "features": feature_metadata
    }

@app.get("/api/sample-patients")
def get_sample_patients():
    if not sample_patients:
        load_artifacts()
    return sample_patients

@app.get("/api/global-importance")
def get_global_importance():
    if not global_importance:
        load_artifacts()
    return global_importance

@app.post("/api/predict")
def predict_cardiac_risk(req: PredictionRequest):
    if len(models) < 4:
        success = load_artifacts()
        if not success:
            raise HTTPException(status_code=503, detail="Models are still training or not available.")

    input_data = req.features

    # Create aligned feature vector using defaults where missing
    row_values = []
    for feat in feature_names:
        if feat in input_data and input_data[feat] is not None:
            try:
                row_values.append(float(input_data[feat]))
            except (ValueError, TypeError):
                default_val = feature_metadata.get(feat, {}).get("median", 0.0)
                row_values.append(float(default_val))
        else:
            default_val = feature_metadata.get(feat, {}).get("median", 0.0)
            row_values.append(float(default_val))

    X_input = pd.DataFrame([row_values], columns=feature_names)

    results = {}
    vessel_risks = {}
    shap_explanations = {}

    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        model = models.get(target)
        if not model:
            continue

        probs = model.predict_proba(X_input)[0]
        prob_positive = float(probs[1]) if len(probs) > 1 else float(probs[0])
        pred_label = int(prob_positive >= 0.5)

        # Risk categorization
        if prob_positive < 0.30:
            risk_tier = "Low"
            risk_color = "#10B981" # Emerald / Green
        elif prob_positive < 0.60:
            risk_tier = "Moderate"
            risk_color = "#F59E0B" # Amber / Orange
        else:
            risk_tier = "High"
            risk_color = "#EF4444" # Red / High Stenosis

        target_result = {
            "prediction": pred_label,
            "probability": round(prob_positive, 4),
            "percentage": round(prob_positive * 100, 1),
            "risk_tier": risk_tier,
            "color": risk_color,
            "description": "High likelihood of significant stenosis (>=50%)" if pred_label == 1 else "Normal or non-significant narrowing (<50%)"
        }

        if target == 'CAD':
            results['cad'] = target_result
        else:
            vessel_risks[target.lower()] = target_result

        # Compute local SHAP explanation
        explainer = shap_explainers.get(target)
        if explainer:
            try:
                sv = explainer.shap_values(X_input)
                # Parse SHAP values
                if isinstance(sv, list):
                    vals = sv[1][0]
                elif len(sv.shape) == 3:
                    vals = sv[0, :, 1]
                else:
                    vals = sv[0]

                # Pair feature name, current value, and SHAP attribution
                factor_list = []
                for f_name, s_val, f_val in zip(feature_names, vals, row_values):
                    factor_list.append({
                        "feature": f_name,
                        "value": f_val,
                        "shap_value": round(float(s_val), 4),
                        "impact": "Increases Risk" if s_val > 0 else "Decreases Risk"
                    })

                # Sort by absolute impact
                factor_list.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
                shap_explanations[target.lower()] = factor_list[:8] # Top 8 driving factors
            except Exception as e:
                print(f"SHAP local explanation error for {target}: {e}")
                shap_explanations[target.lower()] = []

    # Calculate multi-vessel involvement index
    stenosed_vessel_count = sum(1 for v in vessel_risks.values() if v['prediction'] == 1)
    
    return {
        "cad": results.get('cad'),
        "vessels": vessel_risks,
        "stenosed_vessel_count": stenosed_vessel_count,
        "multi_vessel_status": f"{stenosed_vessel_count}-Vessel Disease" if stenosed_vessel_count > 0 else "No Significant Vessel Stenosis",
        "shap_breakdown": shap_explanations,
        "disclaimer": "⚠️ CLINICAL SAFETY DISCLAIMER: Predictions and 3D visual mappings are generated for educational and decision-support demonstration purposes only. This system is not a certified diagnostic device and cannot substitute for coronary angiography, intravascular ultrasound, or direct clinical evaluation."
    }

# Mount static frontend build if it exists
dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
