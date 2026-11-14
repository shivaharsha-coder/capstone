import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
      glow: 'shadow-indigo-500/5',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/5',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/5',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      glow: 'shadow-rose-500/5',
    },
    violet: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      glow: 'shadow-violet-500/5',
    },
  };

  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className={`p-5 rounded-2xl bg-[#0f172a] border border-slate-800/80 shadow-xl ${c.glow} relative overflow-hidden transition-all duration-200 hover:border-slate-700/80 hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{title}</span>
        <div className={`p-2.5 rounded-xl ${c.bg} ${c.border} border ${c.text}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">{trend.label}</span>
          <span className={`font-semibold ${trend.positive ? 'text-emerald-400' : 'text-slate-300'}`}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};

