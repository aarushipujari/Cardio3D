# Cardio3D: Advanced Cardiovascular Risk Visualization & Clinical Workstation
### Multimodal AI Hackathon 2026 — Track A Comprehensive Documentation

---

## 1. Executive Summary & Clinical Innovation

Cardiovascular disease remains the leading cause of mortality worldwide. Standard statistical and predictive algorithms output tabular risk scores or abstract percentages, failing to provide clinicians and patients with an intuitive, spatial understanding of where pathology and arterial blockages are occurring.

**Cardio3D** resolves this limitation by providing a complete clinical workstation integrating:
1. **Multi-Target Machine Learning Engine:** 4 dedicated classifiers predicting **Overall CAD** and vessel-specific stenosis for the three primary coronary arteries:
   - **LAD** (Left Anterior Descending)
   - **LCX** (Left Circumflex)
   - **RCA** (Right Coronary Artery)
2. **Zero-Leakage Compliance:** Complete exclusion of `Cath`, `LAD`, `LCX`, and `RCA` from the model training features $X$, ensuring predictions rely purely on non-invasive clinical, ECG, echocardiographic, and laboratory biomarkers.
3. **Clinical Interpretability (SHAP TreeExplainer):** Real-time feature attribution computing patient-specific risk drivers (waterfall/bar breakdown) and cohort-wide global feature importance rankings.
4. **Interactive 3D Anatomical Heart & Coronary Arborization Engine:**
   - WebGL / Three.js 60 FPS anatomical heart with ventricular chambers, atria, aorta, and great vessels.
   - Multi-branch coronary arterial tree: LAD (with D1, D2 branches), LCX (with OM1, OM2 branches), RCA (with acute marginal, PDA branches).
   - **Dynamic Blood Flow Dynamics:** Luminous animated blood corpuscles flowing along vessel curves at speeds inversely proportional to stenosis severity.
   - **Stenosis Lesion Plaque Rings:** Localized anatomical narrowing indicators with animated warning beacons at critical occlusion sites.
   - **Virtual Endovascular Stent Simulation:** Clinicians can deploy a metallic lattice stent inside any obstructed vessel, immediately restoring patent lumen diameter, blood flow, and reducing predicted vessel risk.
   - **Multi-Mode Shading:** Translucent Glass, Solid Anatomical, Fluoroscopy Angiogram (monochrome catheterization look), and Cyber Hologram.
5. **Real-Time Synthesized Lead II ECG Rhythm Oscilloscope:** Green-phosphor medical monitor displaying live cardiac waveform synchronized with patient heart rate (`PR`) and showing morphological changes for ST segment elevation (STEMI), ST depression, and T-wave inversion.
6. **Vessel Lumen Cross-Section & Hemodynamics Inspector:** Displays the 2D anatomical vessel wall, lipid-rich atheroma narrowing, and computes estimated Fractional Flow Reserve (FFR).
7. **"What-If" Lifestyle & GDMT Treatment Simulator:** Allows clinicians to simulate high-intensity statin therapy, smoking cessation, BP optimization, and glycemic control to visualize instant risk reduction deltas.
8. **Clinical Consultation Report Generator:** One-click generation of hospital-grade Cardiology Consultation Reports ready for printing or PDF export.

---

## 2. Dataset Preprocessing & Anti-Leakage Protocol

### Dataset Source
- **Dataset:** *Extension of Z-Alizadeh Sani Dataset* (UCI Machine Learning Repository / Kaggle).
- **Records:** 303 patient entries with 59 original clinical variables.
- **Completeness:** 0 null values across all features and samples.

### Target Definitions
- **CAD (Overall Coronary Artery Disease):** Extracted from `Cath` (`CAD` = 1, `Normal` = 0). 216 positive (71.3%), 87 negative (28.7%).
- **LAD Stenosis ($\ge 50\%$):** Extracted from `LAD` (`Stenotic` = 1, `Normal` = 0). 177 positive (58.4%), 126 negative.
- **LCX Stenosis ($\ge 50\%$):** Extracted from `LCX` (`Stenotic` = 1, `Normal` = 0). 119 positive (39.3%), 184 negative.
- **RCA Stenosis ($\ge 50\%$):** Extracted from `RCA` (`Stenotic` = 1, `Normal` = 0). 114 positive (37.6%), 189 negative.

### Strict Anti-Leakage Protocol
To guarantee complete clinical integrity:
$$\mathbf{X} = \mathbf{X}_{\text{raw}} \setminus \{\text{Cath}, \text{CAD}, \text{LAD}, \text{LCX}, \text{RCA}\}$$
- The 4 target columns and catheterization ground-truth were strictly removed from input features.
- Remaining 55 physiological features were processed:
  - Binary Y/N clinical flags (18 columns) mapped to $\{0, 1\}$.
  - Gender (`Sex`) mapped to $\{1: \text{Male}, 0: \text{Female}\}$.
  - Valvular heart disease (`VHD`) mapped ordinally $(\text{N}: 0, \text{mild}: 1, \text{Moderate}: 2, \text{Severe}: 3)$.
  - Bundle branch block (`BBB`) encoded into dummy indicators (`BBB_LBBB`, `BBB_RBBB`, `BBB_N`).
  - Total model feature dimension: **57 features**.

---

## 3. Predictive Modeling Pipeline & Benchmarks

Each target was evaluated using **5-Fold Stratified Cross-Validation** across four candidate algorithms: **Random Forest**, **LightGBM**, **XGBoost**, and **Gradient Boosting**. The optimal model was selected by balancing ROC-AUC and F1-score.

### Benchmark Results Table (5-Fold Stratified CV)

| Target Label | Best Algorithm | ROC-AUC | F1-Score | Recall | Precision | Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Overall CAD** | **Random Forest** | **92.57%** | **88.96%** | **95.35%** | **83.46%** | **83.16%** |
| **LAD Stenosis** | **Random Forest** | **85.28%** | **83.39%** | **90.46%** | **77.66%** | **78.90%** |
| **LCX Stenosis** | **LightGBM** | **70.76%** | **53.06%** | **48.70%** | **58.48%** | **66.36%** |
| **RCA Stenosis** | **LightGBM** | **72.62%** | **52.52%** | **45.53%** | **63.89%** | **68.97%** |

---

## 4. Explainable AI & SHAP Feature Attribution

The system integrates `shap.TreeExplainer` for each trained model:
- **Local Attribution:** Computes exact SHAP contribution values for each physiological parameter of the individual patient, separating factors that increase risk (positive attributions) from protective factors (negative attributions).
- **Global Cohort Rankings:**
  - **CAD Primary Drivers:** `Typical Chest Pain`, `Age`, `Atypical Chest Pain`, `Region RWMA`, `EF-TTE` (Ejection Fraction).
  - **LAD Primary Drivers:** `Typical Chest Pain`, `Region RWMA`, `Age`, `EF-TTE`, `Atypical Chest Pain`.
  - **LCX Primary Drivers:** `Age`, `Typical Chest Pain`, `TG` (Triglycerides), `CR` (Creatinine), `HDL`.
  - **RCA Primary Drivers:** `DM` (Diabetes Mellitus), `Typical Chest Pain`, `Age`, `ESR`, `Neutrophil Count`.

---

## 5. How to Run the Application

### 1. Requirements
- Python 3.10+
- Node.js 18+

### 2. Launch the Full-Stack Application
The FastAPI backend serves both the REST API and the compiled frontend build at `http://localhost:8000`:

```bash
cd D:\cardio\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Open your browser at:
```
http://localhost:8000
```

---

## 6. Compliance with Hackathon Evaluation Criteria

| Evaluation Dimension | Weight | Cardio3D Implementation Highlights |
| :--- | :---: | :--- |
| **Predictive Performance** | **30%** | 5-Fold Stratified CV, multi-model evaluation (Random Forest, LightGBM, XGBoost), ROC-AUC up to 92.6%, strict zero target leakage protocol. |
| **3D Visual Mapping** | **25%** | Realistic WebGL 3D heart with multi-branch arterial arborization (LAD, LCX, RCA), animated blood flow particles, virtual stent deployment, dynamic risk color gradients, and camera view presets. |
| **Clinical Interpretability** | **20%** | SHAP TreeExplainer integration providing patient-level factor waterfalls, quantitative contributions, and global cohort importance rankings. |
| **System Integration** | **15%** | Production-grade FastAPI backend paired with modern Vite/React frontend; bidirectional state synchronization between 3D canvas, cross-section inspector, and What-If simulator. |
| **Technical Implementation** | **10%** | Clean, documented, zero GPU bottleneck (runs on standard browsers at 60 FPS), serialized models, ready for deployment. |
