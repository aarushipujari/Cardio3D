import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function SafetyDisclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 px-4 flex items-center gap-3 text-xs text-amber-900 shadow-sm">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
      <div className="flex-1 leading-snug">
        <span className="font-bold text-amber-950 mr-1.5 uppercase tracking-wide text-[11px]">
          Clinical Decision Support Disclaimer:
        </span>
        This system and its 3D anatomical risk mappings are designed for educational research and clinical decision support. Model outputs are computational estimations and do <span className="underline font-semibold">not</span> replace formal invasive coronary angiography, CT angiography, or direct diagnostic judgment by a licensed physician.
      </div>
    </div>
  );
}
