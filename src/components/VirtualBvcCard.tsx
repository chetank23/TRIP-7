'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useTrip } from '@/lib/trip-context';

export function VirtualBvcCard() {
  const { state, remainingBudget, openBudgetModal } = useTrip();
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(false);

  const isConfigured = Boolean(state?.budget?.isConfigured);

  return (
    <div className="relative w-full rounded-[28px] p-6 text-white shadow-floating bvc-card-bg border border-white/20 select-none overflow-hidden transition-all duration-300">
      {/* Decorative gradient overlay and curves */}
      <div className="bvc-card-waves" />
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-black/15 blur-xl pointer-events-none" />

      {/* Top row: Brand & Show/Hide Balance Action */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-black tracking-wider text-white">BVC</span>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white/90 backdrop-blur-sm">
            Shared Trip Card
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsBalanceVisible(!isBalanceVisible)}
          aria-expanded={isBalanceVisible}
          aria-label={isBalanceVisible ? 'Hide Balance' : 'Show Balance'}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-xs font-medium text-white backdrop-blur-md border border-white/20"
        >
          {isBalanceVisible ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Balance</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show Balance</span>
            </>
          )}
        </button>
      </div>

      {/* Middle: Golden Chip & Dynamic Balance Display */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        {/* Realistic golden metallic chip */}
        <div className="w-11 h-8 rounded-lg card-chip relative flex items-center justify-center p-1">
          <div className="w-full h-[1px] bg-[#916715]" />
          <div className="absolute inset-y-1 w-[1px] bg-[#916715] left-1/3" />
          <div className="absolute inset-y-1 w-[1px] bg-[#916715] right-1/3" />
        </div>

        {/* Revealed or Masked Shared Trip Balance */}
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-white/70 block">
            Available Balance
          </span>
          {isBalanceVisible ? (
            isConfigured ? (
              <span className="text-2xl font-black text-white tracking-tight tabular-nums animate-in fade-in duration-200">
                ₹ {remainingBudget.toLocaleString('en-IN')}
              </span>
            ) : (
              <button
                type="button"
                onClick={openBudgetModal}
                className="text-xs font-bold text-white underline underline-offset-2 hover:text-white/80"
              >
                Set Budget Now →
              </button>
            )
          ) : (
            <span className="text-xl font-bold tracking-widest text-white/80 tabular-nums">
              ₹ ••••••
            </span>
          )}
        </div>
      </div>

      {/* Bottom details: Card Number, EXP, CVV */}
      <div className="relative z-10 flex items-end justify-between pt-1">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-white/60 block mb-0.5">
            Card Number
          </span>
          <span className="font-mono text-sm tracking-widest text-white font-bold">
            •••• 7890
          </span>
        </div>

        <div className="flex items-center space-x-6 text-right">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-white/60 block mb-0.5">
              EXP
            </span>
            <span className="font-mono text-xs font-semibold text-white/95">11/2026</span>
          </div>

          <div>
            <span className="text-[9px] uppercase tracking-widest text-white/60 block mb-0.5">
              CVV
            </span>
            <span className="font-mono text-xs font-semibold text-white/95">007</span>
          </div>
        </div>
      </div>
    </div>
  );
}

