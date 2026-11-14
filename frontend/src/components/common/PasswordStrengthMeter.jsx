import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';

export const PasswordStrengthMeter = ({ password = '' }) => {
  const analysis = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUpper && hasLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

    let strength = 'Weak';
    let color = 'bg-rose-500';
    let textColor = 'text-rose-400';
    let width = '25%';

    if (score === 2) {
      strength = 'Medium';
      color = 'bg-amber-500';
      textColor = 'text-amber-400';
      width = '50%';
    } else if (score === 3) {
      strength = 'Medium';
      color = 'bg-amber-500';
      textColor = 'text-amber-400';
      width = '75%';
    } else if (score >= 4) {
      strength = 'Strong';
      color = 'bg-emerald-500';
      textColor = 'text-emerald-400';
      width = '100%';
    }

    return {
      score,
      strength,
      color,
      textColor,
      width,
      hasMinLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
      <div className="flex justify-between items-center">
        <span className="text-slate-400 font-medium">Password Strength:</span>
        <span className={`font-semibold ${analysis.textColor}`}>{analysis.strength}</span>
      </div>

      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${analysis.color}`}
          style={{ width: analysis.width }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1 text-slate-400">
        <div className={`flex items-center gap-1.5 ${analysis.hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
          {analysis.hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          <span>8+ characters</span>
        </div>
        <div className={`flex items-center gap-1.5 ${analysis.hasUpper && analysis.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
          {analysis.hasUpper && analysis.hasLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          <span>Upper & lowercase</span>
        </div>
        <div className={`flex items-center gap-1.5 ${analysis.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
          {analysis.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          <span>At least 1 number</span>
        </div>
        <div className={`flex items-center gap-1.5 ${analysis.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
          {analysis.hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          <span>Special character</span>
        </div>
      </div>
    </div>
  );
};

