import React from 'react';
import { Heart, Activity } from 'lucide-react';

export default function RiskGauges({
  cadRisk = {},
  vesselRisks = {},
  selectedVessel,
  onSelectVessel,
  multiVesselStatus = '',
  stentedVessels = {}
}) {
  const cadProb = cadRisk.probability ?? 0;
  const cadPercent = cadRisk.percentage ?? 0;

  // CAD severity color
  let cadBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let cadBar = 'bg-emerald-600';
  if (cadProb >= 0.6) {
    cadBadge = 'bg-rose-50 text-rose-700 border-rose-200';
    cadBar = 'bg-rose-600';
  } else if (cadProb >= 0.35) {
    cadBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    cadBar = 'bg-amber-500';
  }

  const vessels = [
    {
      id: 'lad',
      name: 'LAD',
      fullName: 'Left Anterior Descending',
      territory: 'Anterior / Septal Wall',
      data: vesselRisks.lad || { percentage: 0, probability: 0, risk_tier: 'Low' }
    },
    {
      id: 'lcx',
      name: 'LCX',
      fullName: 'Left Circumflex',
      territory: 'Lateral / Posterior Wall',
      data: vesselRisks.lcx || { percentage: 0, probability: 0, risk_tier: 'Low' }
    },
    {
      id: 'rca',
      name: 'RCA',
      fullName: 'Right Coronary Artery',
      territory: 'Inferior / RV Wall',
      data: vesselRisks.rca || { percentage: 0, probability: 0, risk_tier: 'Low' }
    }
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Overall CAD Score Card */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Primary Diagnosis
              </span>
              <h3 className="text-sm font-bold text-slate-900 leading-none mt-0.5">
                Overall CAD Classification Risk
              </h3>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cadBadge}`}>
            {cadRisk.risk_tier || 'Low'} Risk
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-4 pt-1">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-baseline gap-1.5">
              {cadPercent}%
              <span className="text-xs font-medium text-slate-500">calibrated probability</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {cadRisk.description || 'Probability of significant coronary narrowing'}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium uppercase text-slate-400">
              Anatomical Extent
            </span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {multiVesselStatus || 'Evaluating...'}
            </div>
          </div>
        </div>

        {/* Linear Risk Meter */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cadBar}`}
            style={{ width: `${Math.min(Math.max(cadPercent, 3), 100)}%` }}
          />
        </div>
      </div>

      {/* Target Coronary Vessel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {vessels.map((v) => {
          const isStented = !!stentedVessels[v.id];
          const prob = isStented ? 0 : v.data.probability || 0;
          const percent = isStented ? 0 : v.data.percentage || 0;
          const isSelected = selectedVessel === v.id;
          const isHigh = prob >= 0.6;
          const isMod = prob >= 0.35 && prob < 0.6;

          let borderCol = isSelected 
            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20' 
            : 'border-slate-200 hover:border-slate-300 bg-white';

          return (
            <div
              key={v.id}
              onClick={() => onSelectVessel(isSelected ? null : v.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between shadow-sm ${borderCol}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: isStented ? '#0284c7' : isHigh ? '#dc2626' : isMod ? '#d97706' : '#059669' }}
                    />
                    {v.name}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isStented
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : isHigh 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : isMod 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {isStented ? 'Stented' : v.data.risk_tier || 'Low'}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-slate-600 truncate" title={v.fullName}>
                  {v.fullName}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {v.territory}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xl font-bold text-slate-900">
                    {percent}%
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isStented ? 'Patent' : prob >= 0.5 ? 'Stenosis (\u226550%)' : 'Patent (<50%)'}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max(percent, 4), 100)}%`,
                      backgroundColor: isStented ? '#0284c7' : isHigh ? '#dc2626' : isMod ? '#d97706' : '#059669'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
