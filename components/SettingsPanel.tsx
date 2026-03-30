import React from 'react';
import { Settings, Zap, Globe, MapPin } from 'lucide-react';
import { AppConfig } from '../types';

interface SettingsPanelProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full mb-4 left-0 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in-up">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Settings size={14} /> Configuration
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">Close</button>
      </div>

      <div className="space-y-5 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        
        {/* Model Preference */}
        <section>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Intelligence</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'fast', icon: Zap, label: 'Fast', desc: 'Lite' },
              { id: 'balanced', icon: Settings, label: 'Std', desc: 'Flash' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setConfig(prev => ({ ...prev, modelPreference: opt.id as any }))}
                className={`flex flex-col items-center p-2 rounded-xl border transition-all ${config.modelPreference === opt.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
              >
                <opt.icon size={16} className="mb-1" />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Capabilities */}
        <section>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Grounding</label>
          <div className="flex gap-2">
            <button
              onClick={() => setConfig(prev => ({ ...prev, capabilities: { ...prev.capabilities, search: !prev.capabilities.search } }))}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${config.capabilities.search ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-white/5 border-transparent text-slate-400'}`}
            >
              <Globe size={14} /> Search
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, capabilities: { ...prev.capabilities, maps: !prev.capabilities.maps } }))}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${config.capabilities.maps ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-white/5 border-transparent text-slate-400'}`}
            >
              <MapPin size={14} /> Maps
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPanel;