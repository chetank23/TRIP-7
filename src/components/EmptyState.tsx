'use client';

import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-cream-300 text-center shadow-card flex flex-col items-center justify-center my-4">
      <div className="w-14 h-14 rounded-2xl bg-cream-100 border border-cream-200 text-bvc-secondary flex items-center justify-center mb-3.5">
        <Icon className="w-7 h-7 stroke-[1.6]" />
      </div>
      <h3 className="text-base font-bold text-bvc-text mb-1">{title}</h3>
      <p className="text-xs text-bvc-secondary max-w-xs leading-relaxed mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-bvc-red hover:bg-bvc-deepRed text-white text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

