import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

export default function EcgMonitor({
  pulseRate = 72,
  stElevation = 0,
  stDepression = 0,
  tInversion = 0
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let x = 0;
    const height = canvas.height;
    const width = canvas.width;
    const midY = height / 2;

    // Draw authentic pink clinical ECG paper grid
    const drawGrid = () => {
      ctx.fillStyle = '#fff1f2'; // Pale medical ECG pink paper
      ctx.fillRect(0, 0, width, height);

      // Fine grid (1mm equivalent)
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let i = 0; i < width; i += 10) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
      }
      for (let j = 0; j < height; j += 10) {
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
      }
      ctx.stroke();

      // Major grid lines (5mm equivalent)
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < width; i += 50) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
      }
      for (let j = 0; j < height; j += 50) {
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
      }
      ctx.stroke();
    };

    drawGrid();

    let lastY = midY;

    const render = () => {
      animId = requestAnimationFrame(render);

      // Sweep erase column (re-draw grid in the erase zone)
      ctx.fillStyle = '#fff1f2';
      ctx.fillRect(x, 0, 16, height);

      // Redraw fine and major grid in erased column
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let i = Math.floor(x / 10) * 10; i <= x + 16; i += 10) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
      }
      for (let j = 0; j < height; j += 10) {
        ctx.moveTo(x, j);
        ctx.lineTo(x + 16, j);
      }
      ctx.stroke();

      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = Math.floor(x / 50) * 50; i <= x + 16; i += 50) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
      }
      for (let j = 0; j < height; j += 50) {
        ctx.moveTo(x, j);
        ctx.lineTo(x + 16, j);
      }
      ctx.stroke();

      // ECG rhythm cycle calculation
      const bps = Math.max(pulseRate, 40) / 60;
      const cycleLength = 220 / bps;
      const phase = (x % cycleLength) / cycleLength;

      let yOffset = 0;

      // P wave
      if (phase >= 0.12 && phase < 0.22) {
        const pPhase = (phase - 0.12) / 0.1;
        yOffset = -10 * Math.sin(pPhase * Math.PI);
      }
      // PR segment
      else if (phase >= 0.22 && phase < 0.32) {
        yOffset = 0;
      }
      // Q wave
      else if (phase >= 0.32 && phase < 0.35) {
        yOffset = 7;
      }
      // R wave (tall clinical spike)
      else if (phase >= 0.35 && phase < 0.40) {
        const rPhase = (phase - 0.35) / 0.05;
        yOffset = -52 * Math.sin(rPhase * Math.PI);
      }
      // S wave
      else if (phase >= 0.40 && phase < 0.44) {
        const sPhase = (phase - 0.40) / 0.04;
        yOffset = 16 * Math.sin(sPhase * Math.PI);
      }
      // ST segment
      else if (phase >= 0.44 && phase < 0.58) {
        let stShift = 0;
        if (stElevation > 0) stShift = -20; // Acute STEMI elevation
        else if (stDepression > 0) stShift = 12; // Ischemia depression
        yOffset = stShift;
      }
      // T wave
      else if (phase >= 0.58 && phase < 0.78) {
        const tPhase = (phase - 0.58) / 0.2;
        let tAmp = 16;
        if (tInversion > 0) tAmp = -16;
        else if (stElevation > 0) tAmp = 26;
        yOffset = -tAmp * Math.sin(tPhase * Math.PI);
      }
      else {
        yOffset = (Math.random() - 0.5) * 1.0;
      }

      const currentY = midY + yOffset;

      // Draw dark clinical stylus tracing
      ctx.beginPath();
      ctx.moveTo(x > 0 ? x - 2 : 0, lastY);
      ctx.lineTo(x, currentY);
      ctx.strokeStyle = stElevation > 0 ? '#b91c1c' : '#0f172a'; // Deep clinical red or black
      ctx.lineWidth = 1.8;
      ctx.stroke();

      lastY = currentY;
      x = (x + 2) % width;
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [pulseRate, stElevation, stDepression, tInversion]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Activity className="w-4 h-4 text-rose-600" />
          <span>Real-Time Rhythm Tracing (Lead II)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-600 text-xs font-mono">
            HR: <strong className="text-slate-900 font-bold">{Math.round(pulseRate)}</strong> bpm
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
            stElevation > 0 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : stDepression > 0 
              ? 'bg-amber-50 text-amber-700 border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {stElevation > 0 ? 'STEMI Pattern (ST Elevation)' : stDepression > 0 ? 'ST Depression' : 'Normal Sinus Rhythm'}
          </span>
        </div>
      </div>

      <div className="relative w-full h-[75px] rounded-xl overflow-hidden border border-rose-200/60 shadow-inner">
        <canvas ref={canvasRef} width={620} height={75} className="w-full h-full block" />
      </div>
    </div>
  );
}
