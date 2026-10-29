'use client';

import React, { useState, useEffect } from 'react';
import { useTrip } from '@/lib/trip-context';
import { X, Wallet, Loader2 } from 'lucide-react';

export function BudgetModal() {
  const { isBudgetModalOpen, closeBudgetModal, updateBudget, state } = useTrip();
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentBudget = state?.budget?.total || 0;
  const isConfigured = Boolean(state?.budget?.isConfigured);

  useEffect(() => {
    if (isBudgetModalOpen) {
      setBudgetAmount(isConfigured && currentBudget > 0 ? String(currentBudget) : '');
      setError(null);
    }
  }, [isBudgetModalOpen, currentBudget, isConfigured]);

  if (!isBudgetModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = Number(budgetAmount);
    if (!budgetAmount || isNaN(val) || val <= 0) {
      setError('Please enter a valid trip budget greater than 0');
      return;
    }

    setIsSubmitting(true);
    await updateBudget(val);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred background */}
      <div
        className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm transition-opacity"
        onClick={closeBudgetModal}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-floating border border-cream-300 z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-bvc-peach/30 text-bvc-red flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-bvc-text">
              {isConfigured ? 'Edit Trip Budget' : 'Set Trip Budget'}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeBudgetModal}
            className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-bvc-secondary hover:text-bvc-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-bvc-secondary mb-4 leading-relaxed">
          Configure the shared budget for the entire group. This authoritative amount will be shared across all 7 friends.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-bvc-error text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative rounded-2xl bg-white border border-cream-300 px-4 py-3 flex items-center focus-within:ring-2 focus-within:ring-bvc-red/20 focus-within:border-bvc-red transition-all">
            <span className="text-2xl font-bold text-bvc-secondary mr-2">₹</span>
            <input
              type="number"
              step="any"
              min="1"
              placeholder="e.g. 20000"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              autoFocus
              className="w-full text-2xl font-extrabold text-bvc-text placeholder:text-cream-400 bg-transparent outline-none tabular-nums"
            />
          </div>

          {/* Quick budget suggestions */}
          <div className="flex items-center gap-2">
            {[10000, 20000, 50000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setBudgetAmount(String(val))}
                className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-white border border-cream-300 text-bvc-secondary hover:border-bvc-red hover:text-bvc-red active:scale-95 transition-all"
              >
                ₹{val.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-bvc-deepRed to-bvc-red hover:from-bvc-red hover:to-bvc-redHighlight text-white text-sm font-bold shadow-redGlow active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isConfigured ? 'Update Shared Budget' : 'Confirm Trip Budget'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

