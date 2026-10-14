import React from 'react';
import { Zap, Activity, Gauge } from 'lucide-react';

export default function VesselCrossSection({
  vesselKey = 'lad',
  vesselData = {},
  hemodynamicsData = {},
  isStented = false,
  onToggleStent
}) {
  const prob = vesselData.probability ?? 0.2;
  const stenosisPercent = isStented ? 0 : Math.round(prob * 100);

  // If backend 1D Navier-Stokes hemodynamics is available, use it; otherwise fallback
  const hemo = hemodynamicsData || {};
  const ffrValue = isStented ? 0.98 : (hemo.ffr ?? (prob >= 0.4 ? Number((0.68 + (1 - prob) * 0.1).toFixed(2)) : 0.92));
  const dpValue = isStented ? 1.5 : (hemo.pressure_drop_mmhg ?? Number((prob * 24.0).toFixed(1)));
  const pdValue = isStented ? 88.0 : (hemo.distal_pressure_pd_mmhg ?? 72.0);
  const isIschemic = !isStented && (ffrValue <= 0.80);

  const vesselDetails = {
    lad: {
      name: 'Left Anterior Descending (LAD)',
      aka: 'Anterior Interventricular Artery',
      territory: 'Anterior LV Wall, Septum, Apex',
      impact: 'Supplies approximately 45-50% of left ventricular myocardium.',
      lesionType: 'Eccentric calcified fibroatheroma',
      nominalDiameter: '3.5 mm'
    },
    lcx: {
      name: 'Left Circumflex (LCX)',
      aka: 'Posterolateral Artery',
      territory: 'Lateral & Posterior LV Wall',
      impact: 'Supplies obtuse marginal branches and posterior left ventricle.',
      lesionType: 'Concentric intimal thickening',
      nominalDiameter: '3.0 mm'
    },
    rca: {
      name: 'Right Coronary Artery (RCA)',
      aka: 'Right Atrioventricular Artery',
      territory: 'Right Ventricle, Inferior LV Wall, SA/AV Nodes',
      impact: 'Supplies acute marginal branches and posterior descending artery.',
      lesionType: 'Lipid-rich atheroma',
      nominalDiameter: '3.2 mm'
    }
  };

  const details = vesselDetails[vesselKey] || vesselDetails['lad'];
  const isSignificant = (prob >= 0.35 || isIschemic) && !isStented;

  const outerR = 45;
  const lumenR = isStented ? 38 : Math.max(12, Math.round(outerR * (1 - (stenosisPercent / 125))));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1D Navier-Stokes Hemodynamics & Cross-Section
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
              {vesselKey.toUpperCase()} · {details.nominalDiameter}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-0.5">
            {details.name}
          </div>
        </div>

        {/* Deploy Stent Button */}
        <button
          onClick={() => onToggleStent && onToggleStent(vesselKey)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            isStented
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>{isStented ? 'Stent Deployed' : 'Deploy Virtual Stent'}</span>
        </button>
      </div>

      {/* Main Grid: SVG Cross-Section + Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* SVG Vessel Cross-Section */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <svg viewBox="0 0 110 110" className="w-28 h-28">
            {/* Outer Tunica Media & Adventitia */}
            <circle cx="55" cy="55" r="48" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="55" cy="55" r="44" fill="#fee2e2" stroke="#dc2626" strokeWidth="2" />

            {/* Atherosclerotic Plaque Region */}
            {!isStented && stenosisPercent > 20 && (
              <path
                d={`M 55 11 A 44 44 0 0 1 97 68 Q 65 55 55 11 Z`}
                fill="#d97706"
                opacity="0.85"
              />
            )}
            {!isStented && stenosisPercent > 45 && (
              <path
                d={`M 15 65 A 44 44 0 0 1 55 11 Q 50 50 15 65 Z`}
                fill="#b45309"
                opacity="0.9"
              />
            )}

            {/* Residual Patent Lumen */}
            <circle
              cx="55"
              cy="58"
              r={lumenR}
              fill={isStented ? '#0284c7' : isSignificant ? '#dc2626' : '#059669'}
              opacity="0.92"
            />

            {/* Stent metallic lattice struts */}
            {isStented && (
              <circle
                cx="55"
                cy="58"
                r="38"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="4,2"
              />
            )}

            <text
              x="55"
              y="61"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
            >
              {isStented ? 'PATENT' : `${stenosisPercent}%`}
            </text>
          </svg>

          <div className="text-[11px] text-slate-500 mt-1 font-mono text-center">
            {isStented ? 'Lumen Restored (100%)' : `Lumen Narrowing: ${stenosisPercent}%`}
          </div>
        </div>

        {/* Hemodynamic Metrics */}
        <div className="sm:col-span-7 flex flex-col gap-2 text-xs">
          {/* FFR Metric */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-600 font-medium">Fractional Flow Reserve (FFR):</span>
            </div>
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
              isStented ? 'bg-blue-100 text-blue-800' : isIschemic ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isStented ? '0.98 (Restored)' : `${ffrValue} ${isIschemic ? '(Ischemic ≤ 0.80)' : '(Preserved)'}`}
            </span>
          </div>

          {/* Translesional Pressure Drop & Distal Pd */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Pressure Drop (ΔP)</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{dpValue} mmHg</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Distal Pressure (Pd)</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{pdValue} mmHg</span>
            </div>
          </div>

          {/* Clinical Action */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-slate-600 font-medium">Revascularization Need:</span>
            <span className={`font-bold text-[11px] ${
              isStented ? 'text-blue-700' : isIschemic ? 'text-rose-700' : 'text-slate-700'
            }`}>
              {isStented ? 'PCI Complete' : isIschemic ? 'Indicated (FFR ≤ 0.80)' : 'Medical Therapy'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 p-2 rounded-lg bg-slate-50 border border-slate-200/60 leading-relaxed">
            <strong className="text-slate-700">Territory:</strong> {details.territory}. {details.impact}
          </div>
        </div>
      </div>
    </div>
  );
}
