import React, { useState } from 'react';
import { User, HeartPulse, Stethoscope, TestTube2, Play } from 'lucide-react';

export default function PatientInputForm({
  patientFeatures = {},
  onChangeFeature,
  onLoadPreset,
  samplePatients = [],
  onSubmitPredict,
  loading = false
}) {
  const [activeTab, setActiveTab] = useState('vitals');
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const handlePresetChange = (presetId) => {
    setSelectedPresetId(presetId);
    const p = samplePatients.find((item) => item.id === presetId);
    if (p && onLoadPreset) {
      onLoadPreset(p);
    }
  };

  const getVal = (feat, def = 0) => {
    return patientFeatures[feat] !== undefined ? patientFeatures[feat] : def;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
      {/* Header and Preset Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Patient Clinical Parameters
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            55 Features • Anti-Leakage Verified
          </span>
        </div>

        {/* Preset Selector Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPresetId}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
          >
            <option value="">-- Select Clinically Validated Patient Case --</option>
            {samplePatients.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
        {[
          { id: 'vitals', label: 'Vitals & Demo', icon: HeartPulse },
          { id: 'symptoms', label: 'Symptoms & History', icon: Stethoscope },
          { id: 'ecg', label: 'ECG & Echo', icon: ActivityIcon },
          { id: 'labs', label: 'Lab Biomarkers', icon: TestTube2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Fields by Tab */}
      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
        {/* TAB 1: Vitals & Demographics */}
        {activeTab === 'vitals' && (
          <div className="flex flex-col gap-3 text-xs">
            {/* Age Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Age</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('Age', 55))} years</span>
              </div>
              <input
                type="range"
                min="30"
                max="85"
                value={getVal('Age', 55)}
                onChange={(e) => onChangeFeature('Age', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Sex Toggle */}
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Sex</span>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => onChangeFeature('Sex', 1)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    getVal('Sex', 1) === 1 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFeature('Sex', 0)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    getVal('Sex', 1) === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            {/* BP Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Systolic Blood Pressure (BP)</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('BP', 125))} mmHg</span>
              </div>
              <input
                type="range"
                min="90"
                max="190"
                value={getVal('BP', 125)}
                onChange={(e) => onChangeFeature('BP', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Pulse Rate */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Pulse Rate (PR)</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('PR', 72))} bpm</span>
              </div>
              <input
                type="range"
                min="50"
                max="120"
                value={getVal('PR', 72)}
                onChange={(e) => onChangeFeature('PR', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* BMI */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Body Mass Index (BMI)</span>
                <span className="font-mono font-bold text-slate-900">{Number(getVal('BMI', 27.5)).toFixed(1)} kg/m²</span>
              </div>
              <input
                type="range"
                min="18"
                max="42"
                step="0.5"
                value={getVal('BMI', 27.5)}
                onChange={(e) => onChangeFeature('BMI', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Symptoms & History */}
        {activeTab === 'symptoms' && (
          <div className="flex flex-col gap-2 text-xs">
            {[
              { key: 'Typical Chest Pain', label: 'Typical Anginal Chest Pain' },
              { key: 'Atypical', label: 'Atypical Chest Pain' },
              { key: 'Nonanginal', label: 'Non-Anginal Discomfort' },
              { key: 'Current Smoker', label: 'Current Smoker' },
              { key: 'DM', label: 'Diabetes Mellitus (DM)' },
              { key: 'HTN', label: 'Hypertension (HTN)' },
              { key: 'FH', label: 'Family History of CAD' },
              { key: 'Obesity', label: 'Clinical Obesity' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80"
              >
                <span className="text-slate-800 font-medium">{item.label}</span>
                <button
                  type="button"
                  onClick={() => onChangeFeature(item.key, getVal(item.key, 0) === 1 ? 0 : 1)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    getVal(item.key, 0) === 1
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  {getVal(item.key, 0) === 1 ? 'Present' : 'Absent'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: ECG & Echo */}
        {activeTab === 'ecg' && (
          <div className="flex flex-col gap-3 text-xs">
            {/* EF */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Ejection Fraction (EF-TTE)</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('EF-TTE', 50))}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="65"
                value={getVal('EF-TTE', 50)}
                onChange={(e) => onChangeFeature('EF-TTE', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">&lt;40%: Reduced EF | &ge;50%: Preserved EF</span>
            </div>

            {/* Region RWMA */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Regional Wall Motion Abnormality (RWMA Score)</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('Region RWMA', 0))}</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={getVal('Region RWMA', 0)}
                onChange={(e) => onChangeFeature('Region RWMA', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* ECG Findings */}
            {[
              { key: 'St Elevation', label: 'ST Segment Elevation (Acute STEMI)' },
              { key: 'St Depression', label: 'ST Segment Depression' },
              { key: 'Tinversion', label: 'T-Wave Inversion' },
              { key: 'Q Wave', label: 'Pathological Q Wave' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80"
              >
                <span className="text-slate-800 font-medium">{item.label}</span>
                <button
                  type="button"
                  onClick={() => onChangeFeature(item.key, getVal(item.key, 0) === 1 ? 0 : 1)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    getVal(item.key, 0) === 1
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  {getVal(item.key, 0) === 1 ? 'Present' : 'Absent'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: Laboratory Biomarkers */}
        {activeTab === 'labs' && (
          <div className="flex flex-col gap-3 text-xs">
            {/* FBS */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Fasting Blood Sugar (FBS)</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('FBS', 105))} mg/dL</span>
              </div>
              <input
                type="range"
                min="70"
                max="320"
                value={getVal('FBS', 105)}
                onChange={(e) => onChangeFeature('FBS', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* LDL */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>LDL Cholesterol</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('LDL', 115))} mg/dL</span>
              </div>
              <input
                type="range"
                min="50"
                max="240"
                value={getVal('LDL', 115)}
                onChange={(e) => onChangeFeature('LDL', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* HDL */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>HDL Cholesterol</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('HDL', 42))} mg/dL</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                value={getVal('HDL', 42)}
                onChange={(e) => onChangeFeature('HDL', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* TG */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Triglycerides (TG)</span>
                <span className="font-mono font-bold text-slate-900">{Math.round(getVal('TG', 150))} mg/dL</span>
              </div>
              <input
                type="range"
                min="60"
                max="450"
                value={getVal('TG', 150)}
                onChange={(e) => onChangeFeature('TG', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* CR */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Creatinine (CR)</span>
                <span className="font-mono font-bold text-slate-900">{Number(getVal('CR', 1.0)).toFixed(1)} mg/dL</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={getVal('CR', 1.0)}
                onChange={(e) => onChangeFeature('CR', parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Execute Prediction Button */}
      <button
        onClick={onSubmitPredict}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>{loading ? 'Evaluating Model Inferences...' : 'Calculate Coronary Risk'}</span>
      </button>
    </div>
  );
}

function ActivityIcon(props) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
