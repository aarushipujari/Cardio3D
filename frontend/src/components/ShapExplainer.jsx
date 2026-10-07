import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';

export default function ShapExplainer({
  shapBreakdown = {},
  globalImportance = {},
  selectedTarget = 'cad',
  onSelectTarget
}) {
  const [viewMode, setViewMode] = useState('local'); // 'local' or 'global'

  const targets = [
    { id: 'cad', label: 'Overall CAD' },
    { id: 'lad', label: 'LAD Artery' },
    { id: 'lcx', label: 'LCX Artery' },
    { id: 'rca', label: 'RCA Artery' }
  ];

  const currentLocalFactors = shapBreakdown[selectedTarget] || [];
  const currentGlobalFactors = globalImportance[selectedTarget.toUpperCase()] || [];

  const maxLocalShap = Math.max(
    ...currentLocalFactors.map((f) => Math.abs(f.shap_value || 0)),
    0.05
  );

  const maxGlobalImportance = Math.max(
    ...currentGlobalFactors.map((f) => f.importance || 0),
    0.01
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Model Interpretability (SHAP TreeExplainer)
          </h3>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode('local')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              viewMode === 'local'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient Attribution
          </button>
          <button
            onClick={() => setViewMode('global')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              viewMode === 'global'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cohort Importance
          </button>
        </div>
      </div>

      {/* Target Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectTarget && onSelectTarget(t.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              selectedTarget === t.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {viewMode === 'local' ? (
        <div className="flex flex-col gap-2 mt-1">
          <div className="text-[11px] text-slate-500 flex items-center justify-between font-medium">
            <span>Primary drivers for selected patient:</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-600" /> Increases Risk
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Decreases Risk
              </span>
            </span>
          </div>

          {currentLocalFactors.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Execute prediction to compute SHAP attributions.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {currentLocalFactors.map((factor, idx) => {
                const isRiskUp = factor.shap_value > 0;
                const percentWidth = Math.min((Math.abs(factor.shap_value) / maxLocalShap) * 100, 100);

                return (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-1 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {factor.feature}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                          val: {typeof factor.value === 'number' ? factor.value.toFixed(1) : factor.value}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-xs">
                        {isRiskUp ? (
                          <span className="text-rose-700 font-bold">
                            +{factor.shap_value.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">
                            {factor.shap_value.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isRiskUp ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${percentWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Global Feature Importance View */
        <div className="flex flex-col gap-2 mt-1">
          <div className="text-[11px] text-slate-500 font-medium">
            Cohort-wide predictive importance across 303 patients:
          </div>

          <div className="flex flex-col gap-1.5 max-h-[290px] overflow-y-auto pr-1">
            {currentGlobalFactors.map((f, idx) => {
              const width = Math.min((f.importance / maxGlobalImportance) * 100, 100);

              return (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      <span className="text-slate-400 mr-1.5 font-mono">#{idx + 1}</span>
                      {f.feature}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {f.importance.toFixed(4)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
