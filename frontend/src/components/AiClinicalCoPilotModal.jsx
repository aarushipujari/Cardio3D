import React, { useState } from 'react';
import { 
  X, Bot, ShieldAlert, HeartPulse, Pill, Stethoscope, 
  CheckCircle2, Copy, Check, BookOpen, AlertCircle 
} from 'lucide-react';

export default function AiClinicalCoPilotModal({
  isOpen,
  onClose,
  consultData = {},
  patientFeatures = {},
  predictionResult = {}
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const data = consultData || {};
  const meds = data.guideline_directed_medications || [];
  const vessels = data.key_vessel_findings || {};

  const handleCopyNotes = () => {
    const text = `
CARDIOLOGY CLINICAL CONSULT NOTE — Cardio3D Co-Pilot
===================================================
Patient Profile: Age ${Math.round(patientFeatures.Age || 55)} | BP: ${Math.round(patientFeatures.BP || 120)} mmHg | HR: ${Math.round(patientFeatures.PR || 72)} bpm | EF: ${Math.round(patientFeatures['EF-TTE'] || 50)}%

CLINICAL ACUITY: ${data.acuity_level || 'EVALUATION PENDING'}
TRIAGE ACTION: ${data.triage_recommendation || 'Clinical review needed'}

PROCEDURAL STRATEGY:
${data.procedural_strategy || 'Conservative management'}

GUIDELINE-DIRECTED MEDICAL THERAPY (GDMT):
${meds.map((m, idx) => `${idx + 1}. [${m.category}] ${m.drug} — ${m.indication} (${m.guideline})`).join('\n')}

PATIENT-FACING SUMMARY:
${data.patient_friendly_summary || 'Follow up with your cardiologist.'}

GUIDELINES CONSULTED:
${(data.guideline_references || []).map(r => `• ${r}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-200">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  AI Cardiology Clinical Co-Pilot
                </h2>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  ACC/AHA Guideline-Concordant
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Automated expert clinical recommendations, triage acuity, and GDMT pharmacotherapy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Notes' : 'Copy Consult Note'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Acuity Banner */}
        <div 
          className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ 
            backgroundColor: `${data.acuity_color || '#0284c7'}10`,
            borderColor: `${data.acuity_color || '#0284c7'}40`
          }}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 flex-shrink-0" style={{ color: data.acuity_color || '#0284c7' }} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: data.acuity_color || '#0284c7' }}>
                Clinical Acuity Assessment
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {data.acuity_level || 'STANDARD RISK WORKUP'}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-700 sm:text-right max-w-md font-medium">
            {data.triage_recommendation}
          </div>
        </div>

        {/* 2-Column Grid: Procedural Plan + Vessel Findings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Procedural Strategy */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <span>Interventional Strategy (PCI vs CABG)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {data.procedural_strategy || 'Evaluate for medical management vs fractional flow reserve measurement.'}
            </p>
          </div>

          {/* Key Vessel Hemodynamic Status */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span>Hemodynamic FFR Vessel Status</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-1">
              {['lad', 'lcx', 'rca'].map(v => {
                const info = vessels[v] || {};
                const isIschemic = info.is_ischemic;
                return (
                  <div key={v} className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="font-bold uppercase text-[11px] text-slate-700">{v}</div>
                    <div className={`font-mono font-bold text-xs mt-0.5 ${isIschemic ? 'text-rose-600' : 'text-emerald-600'}`}>
                      FFR {info.ffr ?? '0.92'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      ΔP {info.pressure_drop ?? '3'} mmHg
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Guideline-Directed Medical Therapy Table */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Pill className="w-4 h-4 text-emerald-600" />
              <span>Guideline-Directed Medical Therapy (GDMT)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Evidence-based pharmacology
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2.5">Medication Category</th>
                  <th className="p-2.5">Specific Agent & Dosage</th>
                  <th className="p-2.5">Clinical Indication</th>
                  <th className="p-2.5 text-right">Guideline Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meds.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="p-2.5 font-bold text-slate-800">{m.category}</td>
                    <td className="p-2.5 font-medium text-blue-700">{m.drug}</td>
                    <td className="p-2.5 text-slate-600">{m.indication}</td>
                    <td className="p-2.5 text-right text-emerald-700 font-semibold">{m.guideline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plain Language Patient Summary */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Plain-Language Patient & Family Summary</span>
          </div>
          <p className="text-xs text-blue-950 leading-relaxed font-normal">
            {data.patient_friendly_summary || 'Your cardiology team will review these results with you to tailor your therapy.'}
          </p>
        </div>

        {/* Footer Citations */}
        <div className="text-[11px] text-slate-400 flex flex-col gap-1 border-t border-slate-100 pt-3">
          <span className="font-semibold text-slate-500">Clinical Guidelines Referenced:</span>
          {(data.guideline_references || []).map((ref, idx) => (
            <span key={idx}>• {ref}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
