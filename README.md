# Cardio3D — Clinical Workstation & 3D Vasculature Engine
> Developed for the **Multimodal AI Hackathon 2026 (Track A)**

Cardio3D is an interactive 3D cardiovascular risk visualization, multi-vessel stenosis prediction, and hemodynamics clinical platform.

---

## Quick Start

### 1. Launch the Application
The FastAPI backend serves both the prediction API and the compiled interactive frontend at:

```bash
cd D:\cardio\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Open in your browser:
👉 **`http://localhost:8000`**

---

## Key Features & Visual Upgrades

1. **High-Fidelity 3D Anatomical Heart (Three.js / WebGL 60 FPS):**
   - Anatomically sculpted cardiac chambers: Left/Right Ventricles, Atria, Ascending Aorta, Pulmonary Trunk, and Vena Cava.
   - **Arterial Arborization:** Full branching for **LAD** (Diagonal D1, D2), **LCX** (Obtuse Marginal OM1, OM2), and **RCA** (Acute Marginal, PDA).
   - **Animated Blood Flow Dynamics:** Luminous animated blood corpuscles running along coronary branches, slowing down dynamically at areas of high stenosis.
   - **Localized Plaque Lesion Rings:** Visual narrowing markers and pulsating warning beacons at critical occlusion sites.
   - **Interactive Virtual Stent Deployment:** Deploy a metallic lattice stent inside any obstructed vessel to instantly restore lumen diameter, clear stenosis, and recalculate risk.
   - **Multiple Rendering Shading Modes:** Translucent Glass, Solid Anatomical, Fluoroscopy Angiogram (monochrome catheterization view), and Cyber Hologram.
   - **Camera Presets:** Anterior, Posterior, Left Lateral, Right Lateral, and Aortic Arch (Top).

2. **Real-Time Lead II ECG Oscilloscope:**
   - Synthesized cardiac rhythm sweep running at the patient's exact heart rate (`PR`).
   - Dynamic ischemic morphology: generates true acute STEMI tombstone elevation when `St Elevation` is present, ST depression, or T-wave inversion.

3. **Vessel Lumen Cross-Section & Hemodynamics Inspector:**
   - Interactive 2D anatomical cross-section showing vessel wall layers, lipid-rich plaque buildup, patent lumen percentage, and estimated Fractional Flow Reserve (FFR).

4. **"What-If" Treatment & Lifestyle Simulator:**
   - Interactive simulation of High-Intensity Statins, Smoking Cessation, BP Optimization, and Glycemic Control showing instant risk reduction deltas.

5. **Hospital-Grade Cardiology Consultation Report:**
   - One-click print / PDF export of clinical findings, patient vitals, 3D anatomical inferences, and SHAP factor attributions.

6. **Predictive ML Performance (Zero Target Leakage):**
   - **CAD:** ROC-AUC: 92.6%, F1: 89.0%
   - **LAD:** ROC-AUC: 85.3%, F1: 83.4%
   - **LCX:** ROC-AUC: 70.8%, F1: 53.1%
   - **RCA:** ROC-AUC: 72.6%, F1: 52.5%

---

For in-depth architecture and benchmark methodology, see [DOCUMENTATION.md](file:///D:/cardio/DOCUMENTATION.md).
