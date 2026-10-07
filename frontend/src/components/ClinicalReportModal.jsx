import React from 'react';
import { X, Printer, FileText } from 'lucide-react';

export default function ClinicalReportModal({
  isOpen,
  onClose,
  patientFeatures = {},
  predictionResult = {},
  stentedVessels = {}
}) {
  if (!isOpen) return null;

  const cad = predictionResult.cad || {};
  const vessels = predictionResult.vessels || {};
  const shap = predictionResult.shap_breakdown || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cardiology Consultation & Decision Support Summary
              </h2>
              <p className="text-xs text-slate-500">
                Cardio3D Multimodal Risk Estimation & Coronary Vasculature Breakdown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Vitals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-slate-500">Age:</span>
            <div className="font-bold text-slate-900 text-sm">{Math.round(patientFeatures.Age || 55)} years</div>
          </div>
          <div>
            <span className="text-slate-500">Sex:</span>
            <div className="font-bold text-slate-900 text-sm">{patientFeatures.Sex === 1 ? 'Male' : 'Female'}</div>
          </div>
          <div>
            <span className="text-slate-500">Blood Pressure:</span>
            <div className="font-bold text-slate-900 text-sm">{Math.round(patientFeatures.BP || 120)} mmHg</div>
          </div>
          <div>
            <span className="text-slate-500">Pulse Rate:</span>
            <div className="font-bold text-slate-900 text-sm">{Math.round(patientFeatures.PR || 72)} bpm</div>
          </div>
          <div>
            <span className="text-slate-500">Ejection Fraction (EF):</span>
            <div className="font-bold text-slate-900 text-sm">{Math.round(patientFeatures['EF-TTE'] || 50)}%</div>
          </div>
          <div>
            <span className="text-slate-500">LDL Cholesterol:</span>
            <div className="font-bold text-slate-900 text-sm">{Math.round(patientFeatures.LDL || 115)} mg/dL</div>
          </div>
          <div>
            <span className="text-slate-500">Fasting Blood Sugar:</span>
            <div className="font-bold text-slate-900 text-sm">{Math.round(patientFeatures.FBS || 100)} mg/dL</div>
          </div>
          <div>
            <span className="text-slate-500">Anginal Pain:</span>
            <div className="font-bold text-slate-900 text-sm">
              {patientFeatures['Typical Chest Pain'] === 1 ? 'Present (Anginal)' : 'Absent'}
            </div>
          </div>
        </div>

        {/* Inferences Summary */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Cardiovascular Inferences & Vessel Involvement
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* CAD */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 font-semibold">Overall CAD</span>
              <div className="text-2xl font-bold text-slate-900 my-1">
                {cad.percentage || 0}%
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-max border ${
                (cad.probability || 0) >= 0.6 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {cad.risk_tier || 'Low'} Risk
              </span>
            </div>

            {/* Vessels */}
            {['lad', 'lcx', 'rca'].map((key) => {
              const v = vessels[key] || {};
              const isStented = !!stentedVessels[key];
              return (
                <div key={key} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold uppercase">{key}</span>
                    {isStented && <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">Stented</span>}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 my-1">
                    {isStented ? '0%' : `${v.percentage || 0}%`}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-max border ${
                    isStented ? 'bg-blue-50 text-blue-700 border-blue-200' : (v.probability || 0) >= 0.6 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {isStented ? 'Patent (Stented)' : `${v.risk_tier || 'Low'} Risk`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top SHAP Attributions */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Top Attributed Clinical Markers (SHAP Factor Analysis)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(shap.cad || []).slice(0, 6).map((f, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-700">{f.feature} (val: {typeof f.value === 'number' ? f.value.toFixed(1) : f.value})</span>
                <span className={`font-mono font-bold ${f.shap_value > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {f.shap_value > 0 ? `+${f.shap_value.toFixed(4)}` : f.shap_value.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
          <strong>CLINICAL & REGULATORY NOTICE:</strong> This report is machine-generated for clinical decision support and educational demonstration under Track A of the Multimodal AI Hackathon 2026. These predictive inferences cannot replace formal invasive coronary angiography or direct clinical judgment.
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
