'use client';

import React from 'react';
import { useTrip } from '@/lib/trip-context';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export function Toast() {
  const { toast } = useTrip();

  if (!toast) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90%] pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className="glass-panel px-4 py-3 rounded-2xl shadow-floating flex items-center space-x-3 border border-cream-300">
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-bvc-success shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-bvc-error shrink-0" />}
        {toast.type === 'info' && <Info className="w-5 h-5 text-bvc-red shrink-0" />}
        <p className="text-sm font-medium text-bvc-text flex-1 leading-snug">{toast.message}</p>
      </div>
    </div>
  );
}
