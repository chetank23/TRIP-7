'use client';

import React from 'react';
import { useTrip } from '@/lib/trip-context';
import { Pencil, Plus, AlertCircle } from 'lucide-react';

export function BudgetSummaryCard() {
  const {
    state,
    totalSpent,
    remainingBudget,
    spentPercentage,
    openBudgetModal,
  } = useTrip();

  const isConfigured = Boolean(state?.budget?.isConfigured);
  const totalBudget = state?.budget?.total || 0;
  const isOverBudget = isConfigured && remainingBudget < 0;

  return (
    <div className="w-full bg-white rounded-3xl p-5 border border-cream-300 shadow-card transition-all">
      {/* Top row: Label & Edit Action */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-bvc-secondary uppercase tracking-wider">
          Trip Budget
        </span>
        <button
          type="button"
          onClick={openBudgetModal}
          className="w-8 h-8 rounded-full bg-bvc-peach/30 text-bvc-red flex items-center justify-center hover:bg-bvc-peach/50 active:scale-95 transition-all"
          title={isConfigured ? 'Edit Trip Budget' : 'Configure Trip Budget'}
          aria-label={isConfigured ? 'Edit Trip Budget' : 'Configure Trip Budget'}
        >
          {isConfigured ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Budget Display */}
      {isConfigured ? (
        <div className="mb-4">
          <div className="text-3xl font-extrabold text-bvc-text tracking-tight tabular-nums flex items-baseline">
            <span>₹ {totalBudget.toLocaleString('en-IN')}</span>
          </div>
        </div>
      ) : (
        <div className="my-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-bvc-text">No Budget Set</p>
            <p className="text-xs text-bvc-secondary">Configure a shared budget for the group</p>
          </div>
          <button
            type="button"
            onClick={openBudgetModal}
            className="px-3.5 py-1.5 rounded-full bg-bvc-red text-white text-xs font-bold shadow-sm hover:bg-bvc-deepRed transition-colors"
          >
            Set Budget
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isConfigured && (
        <>
          <div className="w-full h-2.5 bg-cream-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget
                  ? 'bg-bvc-error'
                  : spentPercentage > 85
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-bvc-peach to-bvc-red'
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>

          {/* Bottom stats: Spent & Remaining */}
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="text-bvc-secondary">
              Spent{' '}
              <span className="text-bvc-text font-bold tabular-nums">
                ₹ {totalSpent.toLocaleString('en-IN')}
              </span>{' '}
              <span className="text-[11px] text-bvc-muted">({spentPercentage}%)</span>
            </div>

            <div className="text-right">
              {isOverBudget ? (
                <div className="flex items-center space-x-1 text-bvc-error">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="font-bold tabular-nums">
                    Over ₹ {Math.abs(remainingBudget).toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <div className="text-bvc-secondary">
                  Remaining{' '}
                  <span className="text-bvc-success font-bold tabular-nums">
                    ₹ {remainingBudget.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
