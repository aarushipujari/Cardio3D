import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import shap

app = FastAPI(
    title="Cardio3D Risk Engine API",
    description="Multimodal Cardiovascular Risk Prediction, 3D Vessel Stenosis Mapping & AI Clinical Co-Pilot",
    version="2.0.0"
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
calibrated_thresholds = {
    'CAD': 0.36,
    'LAD': 0.35,
    'LCX': 0.32,
    'RCA': 0.34
}

def load_artifacts():
    global models, shap_explainers, feature_metadata, feature_names, sample_patients, metrics_summary, global_importance, calibrated_thresholds
    
    cad_model_path = os.path.join(MODELS_DIR, "cad_model.pkl")
    if not os.path.exists(cad_model_path):
        print("Warning: Model artifacts not found yet. Please run train_models.py.")
        return False
        
    for target in ['cad', 'lad', 'lcx', 'rca']:
        path = os.path.join(MODELS_DIR, f"{target}_model.pkl")
        if os.path.exists(path):
            m = joblib.load(path)
            models[target.upper()] = m
            try:
                shap_explainers[target.upper()] = shap.TreeExplainer(m)
            except Exception as e:
                print(f"Error creating SHAP explainer for {target}: {e}")

    # Load thresholds
    thresh_path = os.path.join(MODELS_DIR, "thresholds.json")
    if os.path.exists(thresh_path):
        with open(thresh_path, "r") as f:
            calibrated_thresholds.update(json.load(f))

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

class StentedRequest(BaseModel):
    features: Dict[str, Any]
    stented_vessels: Optional[Dict[str, bool]] = None

def calculate_physics_hemodynamics(stenosis_prob: float, is_stented: bool, bp_sys: float, bp_dia: float, hr: float, vessel_name: str) -> Dict[str, Any]:
    """
    1D Lumped-Parameter Navier-Stokes Hemodynamic Model
    Computes translesional pressure drop (Poiseuille viscous loss + Bernoulli turbulent expansion loss),
    distal coronary pressure (Pd), and physics-grounded Fractional Flow Reserve (FFR).
    """
    # Mean Arterial Pressure (Pa)
    pa = (2.0 / 3.0) * bp_dia + (1.0 / 3.0) * bp_sys
    pa = max(pa, 50.0) # Physiological lower bound
    
    # Nominal diameter D0 (meters): LAD ~3.5mm, LCX ~3.0mm, RCA ~3.2mm
    d0_mm_map = {"lad": 3.5, "lcx": 3.0, "rca": 3.2}
    d0_mm = d0_mm_map.get(vessel_name.lower(), 3.2)
    d0 = d0_mm * 1e-3
    
    if is_stented:
        stenosis_fraction = 0.0
    else:
        # Map predicted probability to estimated anatomical lumen area narrowing
        stenosis_fraction = min(max(stenosis_prob * 1.05, 0.05), 0.95)
        
    area_patent = 1.0 - stenosis_fraction
    ds = d0 * np.sqrt(max(area_patent, 0.05)) # Constricted diameter in meters
    
    # Blood physical properties
    mu = 0.0035 # Dynamic viscosity (Pa*s)
    rho = 1060.0 # Density (kg/m^3)
    L = 0.015 # Lesion length (15 mm)
    
    # Hyperemic coronary blood flow Q (m^3/s), scaled by heart rate
    flow_ml_min = (hr / 75.0) * 190.0
    q = flow_ml_min * (1e-6 / 60.0)
    
    # Poiseuille Viscous Friction Loss: Delta_P_viscous = (128 * mu * L / (pi * Ds^4)) * Q
    dp_viscous = (128.0 * mu * L / (np.pi * (ds ** 4))) * q
    
    # Bernoulli Turbulent Expansion Loss: Delta_P_turbulent = (rho / 2) * (1/As - 1/A0)^2 * Q^2
    a0 = np.pi * ((d0 / 2.0) ** 2)
    as_area = np.pi * ((ds / 2.0) ** 2)
    dp_turbulent = (rho / 2.0) * ((1.0 / as_area - 1.0 / a0) ** 2) * (q ** 2)
    
    # Total pressure drop in Pa -> mmHg (1 mmHg = 133.322 Pa)
    dp_total_pa = dp_viscous + dp_turbulent
    dp_mmhg = dp_total_pa / 133.322
    
    # Distal pressure (Pd) and FFR
    pd = max(pa - dp_mmhg, 12.0)
    ffr = min(max(pd / pa, 0.25), 1.00)
    
    # Relative flow velocity percentage
    velocity_pct = round(max(area_patent * 100.0, 18.0), 1) if not is_stented else 100.0
    
    return {
        "mean_arterial_pressure_mmhg": round(pa, 1),
        "pressure_drop_mmhg": round(dp_mmhg, 1),
        "distal_pressure_pd_mmhg": round(pd, 1),
        "ffr": round(ffr, 2),
        "is_ischemic": bool(ffr <= 0.80),
        "patent_lumen_pct": round(area_patent * 100.0, 1),
        "flow_velocity_pct": velocity_pct,
        "stenosis_severity_category": "Severe (FFR <= 0.80)" if ffr <= 0.80 else ("Moderate (0.81-0.89)" if ffr < 0.90 else "Non-significant (>= 0.90)")
    }

@app.get("/api/health")
def health_check():
    loaded = len(models) == 4
    return {
        "status": "healthy" if loaded else "initializing",
        "models_loaded": list(models.keys()),
        "features_count": len(feature_names),
        "calibrated_thresholds": calibrated_thresholds
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

    # Align feature values
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

    # Extract hemodynamics baseline vitals
    bp_sys = float(input_data.get("BP", 120.0) or 120.0)
    bp_dia = 80.0 # standard diastolic if not explicitly separate
    hr = float(input_data.get("PR", 72.0) or 72.0)

    results = {}
    vessel_risks = {}
    hemodynamics = {}
    shap_explanations = {}

    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        model = models.get(target)
        if not model:
            continue

        probs = model.predict_proba(X_input)[0]
        prob_positive = float(probs[1]) if len(probs) > 1 else float(probs[0])
        
        # Clinical calibrated threshold
        cal_thresh = calibrated_thresholds.get(target, 0.5)
        pred_label = int(prob_positive >= cal_thresh)

        # Risk categorization based on probability
        if prob_positive < 0.30:
            risk_tier = "Low"
            risk_color = "#10B981" # Emerald / Green
        elif prob_positive < 0.60:
            risk_tier = "Moderate"
            risk_color = "#F59E0B" # Amber / Orange
        else:
            risk_tier = "High"
            risk_color = "#EF4444" # Red / Critical

        target_result = {
            "prediction": pred_label,
            "probability": round(prob_positive, 4),
            "percentage": round(prob_positive * 100, 1),
            "calibrated_threshold": cal_thresh,
            "risk_tier": risk_tier,
            "color": risk_color,
            "description": "High likelihood of significant stenosis (>=50%)" if pred_label == 1 else "Normal or non-significant narrowing (<50%)"
        }

        if target == 'CAD':
            results['cad'] = target_result
        else:
            v_key = target.lower()
            vessel_risks[v_key] = target_result
            # Physics-based hemodynamics
            hemodynamics[v_key] = calculate_physics_hemodynamics(
                stenosis_prob=prob_positive,
                is_stented=False,
                bp_sys=bp_sys,
                bp_dia=bp_dia,
                hr=hr,
                vessel_name=v_key
            )

        # Compute local SHAP explanation
        explainer = shap_explainers.get(target)
        if explainer:
            try:
                sv = explainer.shap_values(X_input)
                if isinstance(sv, list):
                    vals = sv[1][0]
                elif len(sv.shape) == 3:
                    vals = sv[0, :, 1]
                else:
                    vals = sv[0]

                factor_list = []
                for f_name, s_val, f_val in zip(feature_names, vals, row_values):
                    factor_list.append({
                        "feature": f_name,
                        "value": f_val,
                        "shap_value": round(float(s_val), 4),
                        "impact": "Increases Risk" if s_val > 0 else "Decreases Risk"
                    })

                factor_list.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
                shap_explanations[target.lower()] = factor_list[:8]
            except Exception as e:
                shap_explanations[target.lower()] = []

    stenosed_vessel_count = sum(1 for v in vessel_risks.values() if v['prediction'] == 1)
    
    return {
        "cad": results.get('cad'),
        "vessels": vessel_risks,
        "hemodynamics": hemodynamics,
        "stenosed_vessel_count": stenosed_vessel_count,
        "multi_vessel_status": f"{stenosed_vessel_count}-Vessel Disease" if stenosed_vessel_count > 0 else "No Significant Vessel Stenosis",
        "shap_breakdown": shap_explanations,
        "disclaimer": "⚠️ CLINICAL DECISION SUPPORT DISCLAIMER: Cardio3D predictions, hemodynamic FFR estimations, and 3D visual models are generated for clinical assistance, education, and research decision support. Not a standalone medical diagnostic device."
    }

@app.post("/api/clinical-consult")
def generate_clinical_consult(req: PredictionRequest):
    """
    AI Clinical Co-Pilot Engine:
    Synthesizes patient parameters, multi-vessel stenosis predictions, ECG patterns, and FFR values
    into ACC/AHA/ESC guideline-concordant cardiology recommendations and plain-language patient summaries.
    """
    pred_res = predict_cardiac_risk(req)
    input_data = req.features

    age = float(input_data.get("Age", 55.0) or 55.0)
    sex = "Male" if float(input_data.get("Sex", 1.0) or 1.0) == 1.0 else "Female"
    bp = float(input_data.get("BP", 120.0) or 120.0)
    pr = float(input_data.get("PR", 72.0) or 72.0)
    ef = float(input_data.get("EF-TTE", 50.0) or 50.0)
    st_elev = int(input_data.get("St Elevation", 0) or 0)
    typical_cp = int(input_data.get("Typical Chest Pain", 0) or 0)
    dm = int(input_data.get("Diabetes", 0) or 0)
    smoker = int(input_data.get("Current Smoker", 0) or 0)
    ldl = float(input_data.get("LDL", 100.0) or 100.0)

    vessels = pred_res.get("vessels", {})
    hemo = pred_res.get("hemodynamics", {})
    stenosed_count = pred_res.get("stenosed_vessel_count", 0)
    cad_prob = pred_res.get("cad", {}).get("probability", 0.5)

    # 1. Determine Clinical Acuity Level
    if st_elev == 1:
        acuity = "EMERGENT (Level 1 — Acute STEMI Protocol)"
        acuity_color = "#DC2626"
        triage_recommendation = "Immediate activation of Cardiac Catheterization Laboratory for primary percutaneous coronary intervention (PCI). Target door-to-balloon time < 90 minutes."
    elif stenosed_count >= 2 or ef < 40.0:
        acuity = "URGENT (Level 2 — Inpatient Cardiology Workup)"
        acuity_color = "#EA580C"
        triage_recommendation = "Inpatient admission with continuous telemetry. Urgent coronary angiography and multidisciplinary Heart Team consultation."
    elif stenosed_count == 1:
        acuity = "PRIORITY (Level 3 — Non-Emergent Interventional Workup)"
        acuity_color = "#D97706"
        triage_recommendation = "Coronary Computed Tomography Angiography (CCTA) or elective invasive coronary angiogram with hemodynamic FFR wire interrogation."
    else:
        acuity = "ELECTIVE / OUTPATIENT (Level 4 — Primary Prevention & Follow-up)"
        acuity_color = "#16A34A"
        triage_recommendation = "Outpatient preventive cardiology management, risk factor optimization, and routine stress echocardiography screening."

    # 2. Guideline-Directed Medical Therapy (GDMT)
    medications = []
    
    # Antiplatelet
    if st_elev == 1 or cad_prob > 0.65:
        medications.append({
            "category": "Dual Antiplatelet Therapy (DAPT)",
            "drug": "Aspirin 81 mg daily + Ticagrelor 90 mg BID (or Clopidogrel 75 mg daily)",
            "indication": "Acute coronary syndrome or high-risk coronary stenosis to prevent thrombotic occlusion",
            "guideline": "Class I, LOE A (ACC/AHA/SCAI 2021)"
        })
    else:
        medications.append({
            "category": "Antiplatelet",
            "drug": "Aspirin 81 mg daily",
            "indication": "Secondary prevention of atherosclerotic cardiovascular events",
            "guideline": "Class I, LOE A"
        })

    # Statin / Lipid
    if ldl >= 70 or cad_prob > 0.50:
        medications.append({
            "category": "High-Intensity Statin Therapy",
            "drug": "Atorvastatin 80 mg daily (or Rosuvastatin 40 mg daily)",
            "indication": "Target LDL-C reduction >= 50% and plaque stabilization",
            "guideline": "Class I, LOE A (ACC/AHA 2018 Cholesterol Guidelines)"
        })

    # Heart Failure / Low EF / Antihypertensive
    if ef <= 45.0 or bp > 130.0:
        medications.append({
            "category": "Beta-Blocker",
            "drug": "Metoprolol Succinate 25-50 mg daily (titrate up)",
            "indication": "Myocardial oxygen demand reduction, antiarrhythmic, and neurohormonal modulation in reduced EF",
            "guideline": "Class I, LOE A (ACC/AHA 2022 Heart Failure Guidelines)"
        })
        medications.append({
            "category": "ACEi / ARB / ARNI",
            "drug": "Lisinopril 10 mg daily (or Sacubitril/Valsartan 49/51 mg BID if HFrEF)",
            "indication": "Left ventricular reverse remodeling and blood pressure control",
            "guideline": "Class I, LOE A"
        })

    # Diabetic CAD
    if dm == 1:
        medications.append({
            "category": "SGLT2 Inhibitor",
            "drug": "Empagliflozin 10 mg daily (or Dapagliflozin 10 mg daily)",
            "indication": "Cardiovascular risk reduction in diabetic CAD and renal protection",
            "guideline": "Class I, LOE A (ADA/ACC 2023 Guidelines)"
        })

    # 3. Procedural Revascularization Strategy
    if stenosed_count >= 3 or (stenosed_count >= 2 and ef < 40.0):
        procedural_strategy = "Heart Team Review (Cardiologist + Cardiac Surgeon) recommended. Complex multi-vessel disease with compromised ventricular function favors Coronary Artery Bypass Grafting (CABG) over multi-vessel stenting to achieve complete arterial revascularization."
    elif stenosed_count > 0:
        vessel_names = [v.upper() for v, d in vessels.items() if d.get("prediction") == 1]
        procedural_strategy = f"Percutaneous Coronary Intervention (PCI) with second-generation Drug-Eluting Stents (DES) targeting: {', '.join(vessel_names)}. Pre- and post-intervention intracoronary FFR / IVUS recommended to ensure optimal stent expansion."
    else:
        procedural_strategy = "Medical therapy without immediate invasive revascularization. Conservative lifestyle modification and serial non-invasive assessment."

    # 4. Plain-Language Patient Summary
    patient_summary = (
        f"Hello. Based on your health assessment, your heart shows an overall condition risk of {int(cad_prob * 100)}%. "
        f"Our 3D model detected {'potential narrowing in ' + str(stenosed_count) + ' main heart blood vessels' if stenosed_count > 0 else 'good blood flow without severe narrowing'}. "
        f"Your blood pressure is currently {int(bp)} mmHg and your heart pump strength (ejection fraction) is {int(ef)}%. "
        f"Your care team will review these results to determine if a specialized picture of your arteries (coronary angiogram or CT scan) is needed, and may prescribe medications to keep your arteries open and cholesterol well protected."
    )

    return {
        "acuity_level": acuity,
        "acuity_color": acuity_color,
        "triage_recommendation": triage_recommendation,
        "procedural_strategy": procedural_strategy,
        "guideline_directed_medications": medications,
        "patient_friendly_summary": patient_summary,
        "key_vessel_findings": {
            v: {
                "risk": vessels.get(v, {}).get("risk_tier", "Normal"),
                "ffr": hemo.get(v, {}).get("ffr", 0.95),
                "is_ischemic": hemo.get(v, {}).get("is_ischemic", False),
                "pressure_drop": hemo.get(v, {}).get("pressure_drop_mmhg", 2.0)
            } for v in ['lad', 'lcx', 'rca']
        },
        "guideline_references": [
            "2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization",
            "2023 AHA/ACC/ACCP/ASPC/NLA/PCNA Guideline for the Management of Patients With Chronic Coronary Disease",
            "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
            "2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol"
        ]
    }

# Mount static frontend build if it exists
dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
