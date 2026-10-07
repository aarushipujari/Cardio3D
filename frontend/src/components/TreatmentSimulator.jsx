import React from 'react';
import { HeartHandshake, Check, RefreshCcw, Pill, Flame, Activity, Sparkles } from 'lucide-react';

export default function TreatmentSimulator({
  patientFeatures = {},
  onApplyIntervention,
  onResetBaseline,
  activeInterventions = {},
  baselineFeatures = {}
}) {
  const interventions = [
    {
      id: 'statin',
      title: 'High-Intensity Statin Therapy',
      desc: 'Reduces LDL to 70 mg/dL and stabilizes lipid-rich arterial atheromas.',
      icon: Pill,
      apply: (f) => ({ ...f, LDL: 70, TG: Math.min(f.TG || 150, 130) })
    },
    {
      id: 'smoking_cessation',
      title: 'Smoking Cessation Protocol',
      desc: 'Halts acute endothelial dysfunction and coronary vasospasm.',
      icon: Flame,
      apply: (f) => ({ ...f, 'Current Smoker': 0, 'EX-Smoker': 1 })
    },
    {
      id: 'bp_control',
      title: 'Optimal BP Control (ACEi / ARB)',
      desc: 'Normalizes systolic BP to 120 mmHg, reducing myocardial wall tension.',
      icon: Activity,
      apply: (f) => ({ ...f, BP: 120, PR: Math.min(f.PR || 75, 70) })
    },
    {
      id: 'glycemic_control',
      title: 'Strict Glycemic Optimization',
      desc: 'Normalizes fasting blood sugar to 95 mg/dL.',
      icon: Sparkles,
      apply: (f) => ({ ...f, FBS: 95 })
    }
  ];

  const handleToggle = (item) => {
    const isCurrentlyActive = !!activeInterventions[item.id];
    onApplyIntervention(item.id, !isCurrentlyActive, item.apply);
  };

  const activeCount = Object.values(activeInterventions).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            "What-If" GDMT & Lifestyle Simulator
          </h3>
        </div>

        {activeCount > 0 && (
          <button
            onClick={onResetBaseline}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="text-[11px] text-slate-500 font-medium">
        Simulate guideline interventions to observe projected risk reduction in real-time:
      </div>

      {/* Intervention Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {interventions.map((item) => {
          const Icon = item.icon;
          const isActive = !!activeInterventions[item.id];

          return (
            <div
              key={item.id}
              onClick={() => handleToggle(item)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                isActive
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60 text-slate-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">{item.title}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
