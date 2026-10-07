import React, { useState, useEffect } from 'react';
import HeartViewer from './components/HeartViewer';
import RiskGauges from './components/RiskGauges';
import ShapExplainer from './components/ShapExplainer';
import PatientInputForm from './components/PatientInputForm';
import ModelEvaluationModal from './components/ModelEvaluationModal';
import ClinicalReportModal from './components/ClinicalReportModal';
import EcgMonitor from './components/EcgMonitor';
import VesselCrossSection from './components/VesselCrossSection';
import TreatmentSimulator from './components/TreatmentSimulator';
import SafetyDisclaimer from './components/SafetyDisclaimer';
import { 
  Activity, Award, Heart, FileText, CheckCircle2 
} from 'lucide-react';

const FALLBACK_PATIENTS = [
  {
    id: "case_a",
    name: "Case A: Low-Risk Screening (Patent Vessels)",
    features: {
      "Age": 48, "Weight": 68, "Length": 172, "BMI": 23.0, "BP": 118, "PR": 68,
      "FBS": 88, "CR": 0.8, "TG": 110, "LDL": 82, "HDL": 52, "BUN": 12, "ESR": 6, "HB": 14.2,
      "K": 4.1, "Na": 140, "WBC": 5800, "Lymph": 34, "Neut": 58, "PLT": 220, "EF-TTE": 60,
      "Current Smoker": 0, "EX-Smoker": 0, "Diabetes": 0, "HTN": 0, "Dyslipidemia": 0,
      "Typical Chest Pain": 0, "Atypical": 0, "Nonanginal": 0, "Exertional CP": 0,
      "St Elevation": 0, "St Depression": 0, "Tinversion": 0, "Q Wave": 0
    }
  },
  {
    id: "case_b",
    name: "Case B: High-Risk Multi-Vessel CAD (LAD + LCX)",
    features: {
      "Age": 63, "Weight": 84, "Length": 168, "BMI": 29.8, "BP": 152, "PR": 82,
      "FBS": 158, "CR": 1.3, "TG": 240, "LDL": 168, "HDL": 34, "BUN": 22, "ESR": 24, "HB": 13.1,
      "K": 4.4, "Na": 138, "WBC": 8900, "Lymph": 22, "Neut": 72, "PLT": 275, "EF-TTE": 45,
      "Current Smoker": 1, "EX-Smoker": 0, "Diabetes": 1, "HTN": 1, "Dyslipidemia": 1,
      "Typical Chest Pain": 1, "Atypical": 0, "Nonanginal": 0, "Exertional CP": 1,
      "St Elevation": 1, "St Depression": 0, "Tinversion": 1, "Q Wave": 1
    }
  },
  {
    id: "case_c",
    name: "Case C: Isolated Inferior Wall / RCA Stenosis",
    features: {
      "Age": 56, "Weight": 78, "Length": 174, "BMI": 25.8, "BP": 138, "PR": 74,
      "FBS": 112, "CR": 1.0, "TG": 185, "LDL": 132, "HDL": 40, "BUN": 16, "ESR": 14, "HB": 14.0,
      "K": 4.2, "Na": 139, "WBC": 6800, "Lymph": 28, "Neut": 64, "PLT": 240, "EF-TTE": 52,
      "Current Smoker": 0, "EX-Smoker": 1, "Diabetes": 0, "HTN": 1, "Dyslipidemia": 1,
      "Typical Chest Pain": 1, "Atypical": 0, "Nonanginal": 0, "Exertional CP": 1,
      "St Elevation": 0, "St Depression": 1, "Tinversion": 1, "Q Wave": 0
    }
  }
];

const FALLBACK_PREDICTION = {
  cad: {
    prediction: 1,
    probability: 0.91,
    percentage: 91.0,
    risk_tier: 'High',
    color: '#EF4444',
    description: 'High likelihood of significant stenosis (>=50%)'
  },
  vessels: {
    lad: { prediction: 1, probability: 0.74, percentage: 74.0, risk_tier: 'High', color: '#EF4444' },
    lcx: { prediction: 0, probability: 0.45, percentage: 45.0, risk_tier: 'Moderate', color: '#F59E0B' },
    rca: { prediction: 0, probability: 0.36, percentage: 36.0, risk_tier: 'Moderate', color: '#F59E0B' }
  },
  multi_vessel_status: 'Multi-Vessel CAD (2 Vessels)',
  shap_breakdown: {
    cad: [
      { feature: 'Typical Chest Pain', value: '1', shap_value: 0.38, direction: 'increases', impact: 'High' },
      { feature: 'Age', value: '63', shap_value: 0.22, direction: 'increases', impact: 'High' },
      { feature: 'EF-TTE', value: '45%', shap_value: 0.18, direction: 'increases', impact: 'Moderate' },
      { feature: 'Diabetes', value: '1', shap_value: 0.14, direction: 'increases', impact: 'Moderate' },
      { feature: 'St Elevation', value: '1', shap_value: 0.12, direction: 'increases', impact: 'Moderate' }
    ]
  }
};

export default function App() {
  const [patientFeatures, setPatientFeatures] = useState(FALLBACK_PATIENTS[1].features);
  const [baselineFeatures, setBaselineFeatures] = useState(FALLBACK_PATIENTS[1].features);
  const [predictionResult, setPredictionResult] = useState(FALLBACK_PREDICTION);
  const [selectedVessel, setSelectedVessel] = useState('lad');
  const [selectedTarget, setSelectedTarget] = useState('cad');
  const [samplePatients, setSamplePatients] = useState(FALLBACK_PATIENTS);
  const [metricsData, setMetricsData] = useState({});
  const [globalImportance, setGlobalImportance] = useState({});
  const [stentedVessels, setStentedVessels] = useState({});
  const [activeInterventions, setActiveInterventions] = useState({});
  
  // Modals
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        // 1. Fetch sample patients
        const pRes = await fetch('/api/sample-patients');
        if (pRes.ok) {
          const patients = await pRes.json();
          setSamplePatients(patients);
          if (patients.length > 1) {
            const initialPatient = patients[1]; // Case B: Multi-vessel
            setPatientFeatures(initialPatient.features);
            setBaselineFeatures(initialPatient.features);
            runPredict(initialPatient.features);
          }
        } else {
          runPredict(FALLBACK_PATIENTS[1].features);
        }

        // 2. Fetch metrics
        const mRes = await fetch('/api/metrics');
        if (mRes.ok) {
          const mData = await mRes.json();
          setMetricsData(mData);
        }

        // 3. Fetch global importance
        const gRes = await fetch('/api/global-importance');
        if (gRes.ok) {
          const gData = await gRes.json();
          setGlobalImportance(gData);
        }
      } catch (err) {
        console.warn("Backend starting, using calibrated initial state:", err);
        runPredict(FALLBACK_PATIENTS[1].features);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  const runPredict = async (featuresToUse = patientFeatures) => {
    try {
      setLoading(true);
      setApiError(null);
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: featuresToUse })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setPredictionResult(data);
    } catch (err) {
      console.error("Prediction error:", err);
      setApiError("Failed to calculate cardiac risk. Please verify input parameters.");
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureChange = (key, value) => {
    setPatientFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const handleLoadPreset = (preset) => {
    setPatientFeatures(preset.features);
    setBaselineFeatures(preset.features);
    setStentedVessels({});
    setActiveInterventions({});
    runPredict(preset.features);
  };

  const handleSelectVessel = (vesselId) => {
    setSelectedVessel(vesselId);
    if (vesselId) {
      setSelectedTarget(vesselId);
    } else {
      setSelectedTarget('cad');
    }
  };

  const handleToggleStent = (vesselKey) => {
    setStentedVessels((prev) => ({
      ...prev,
      [vesselKey]: !prev[vesselKey]
    }));
  };

  const handleApplyIntervention = (interventionId, shouldApply, transformFn) => {
    setActiveInterventions((prev) => ({
      ...prev,
      [interventionId]: shouldApply
    }));

    if (shouldApply) {
      const updated = transformFn(patientFeatures);
      setPatientFeatures(updated);
      runPredict(updated);
    } else {
      const reverted = { ...baselineFeatures };
      setPatientFeatures(reverted);
      runPredict(reverted);
    }
  };

  const handleResetBaseline = () => {
    setPatientFeatures({ ...baselineFeatures });
    setActiveInterventions({});
    setStentedVessels({});
    runPredict(baselineFeatures);
  };

  // Auto-reconnect polling if connection was lost
  useEffect(() => {
    if (!apiError) return;
    const timer = setTimeout(() => {
      runPredict(patientFeatures);
    }, 3000);
    return () => clearTimeout(timer);
  }, [apiError, patientFeatures]);

  const vesselRisks = predictionResult ? predictionResult.vessels : {};
  const cadRisk = predictionResult ? predictionResult.cad : {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Cardio3D Coronary Decision Support
                </h1>
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.2 rounded-full">
                  Clinical Workstation
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Multimodal AI 2026 • 3D Anatomical Stenosis Mapping & SHAP Factor Attribution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Consultation Report</span>
            </button>

            <button
              onClick={() => setShowMetricsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Model Benchmarks</span>
            </button>

            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border ${
              apiError 
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${apiError ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
              <span>{apiError ? 'Reconnecting Engine...' : 'ML Engine Online'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workstation Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-5">
        {/* API Error Notification */}
        {apiError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{apiError} Reconnecting automatically...</span>
            </div>
            <button
              onClick={() => runPredict()}
              className="underline font-bold text-amber-900 ml-2"
            >
              Retry Now
            </button>
          </div>
        )}

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: 3D Heart Viewer & Diagnostic Tools (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* 3D Heart Viewport Container */}
            <div className="w-full">
              <HeartViewer
                vesselRisks={vesselRisks}
                selectedVessel={selectedVessel}
                onSelectVessel={handleSelectVessel}
                stentedVessels={stentedVessels}
                onToggleStent={handleToggleStent}
                pulseRate={patientFeatures.PR || 72}
              />
            </div>

            {/* Real-Time Synthesized Lead II ECG Paper Tracing */}
            <EcgMonitor
              pulseRate={patientFeatures.PR || 72}
              stElevation={patientFeatures['St Elevation'] || 0}
              stDepression={patientFeatures['St Depression'] || 0}
              tInversion={patientFeatures['Tinversion'] || 0}
            />

            {/* Overall Risk & Coronary Artery Cards */}
            <RiskGauges
              cadRisk={cadRisk}
              vesselRisks={vesselRisks}
              selectedVessel={selectedVessel}
              onSelectVessel={handleSelectVessel}
              multiVesselStatus={predictionResult?.multi_vessel_status}
              stentedVessels={stentedVessels}
            />

            {/* Interactive Vessel Cross-Section & Hemodynamics */}
            {selectedVessel && (
              <VesselCrossSection
                vesselKey={selectedVessel}
                vesselData={vesselRisks[selectedVessel] || {}}
                isStented={!!stentedVessels[selectedVessel]}
                onToggleStent={handleToggleStent}
              />
            )}
          </div>

          {/* RIGHT COLUMN: Patient Parameters, What-If Simulator & SHAP (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Patient Clinical Profile Form */}
            <PatientInputForm
              patientFeatures={patientFeatures}
              onChangeFeature={handleFeatureChange}
              onLoadPreset={handleLoadPreset}
              samplePatients={samplePatients}
              onSubmitPredict={() => runPredict()}
              loading={loading}
            />

            {/* "What-If" GDMT & Lifestyle Simulator */}
            <TreatmentSimulator
              patientFeatures={patientFeatures}
              onApplyIntervention={handleApplyIntervention}
              onResetBaseline={handleResetBaseline}
              activeInterventions={activeInterventions}
              baselineFeatures={baselineFeatures}
            />

            {/* SHAP Interpretability Breakdown */}
            <ShapExplainer
              shapBreakdown={predictionResult?.shap_breakdown || {}}
              globalImportance={globalImportance}
              selectedTarget={selectedTarget}
              onSelectTarget={(target) => setSelectedTarget(target)}
            />
          </div>
        </div>

        {/* Clinical Safety Disclaimer Banner */}
        <SafetyDisclaimer />
      </main>

      {/* Model Benchmark & Validation Modal */}
      <ModelEvaluationModal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        metricsData={metricsData}
      />

      {/* Comprehensive Clinical Consultation Report Modal */}
      <ClinicalReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        patientFeatures={patientFeatures}
        predictionResult={predictionResult || {}}
        stentedVessels={stentedVessels}
      />
    </div>
  );
}
