'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTrip } from '@/lib/trip-context';
import { BudgetSource } from '@/types';
import { Plus, Trash2, Wallet, X, Loader2, Coins, Layers } from 'lucide-react';

function createSource(): BudgetSource {
  return { id: `budget_source_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: '', unitAmount: 0, quantity: 1 };
}

function formatRupees(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BudgetModal() {
  const { isBudgetModalOpen, closeBudgetModal, updateBudget, state } = useTrip();
  const [sources, setSources] = useState<BudgetSource[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedForOpen = useRef(false);

  const currentBudget = state?.budget?.total || 0;
  const isConfigured = Boolean(state?.budget?.isConfigured);

  useEffect(() => {
    if (!isBudgetModalOpen) {
      initializedForOpen.current = false;
      return;
    }
    if (initializedForOpen.current) return;
    initializedForOpen.current = true;

    const savedSources = state?.budget?.sources;
    if (Array.isArray(savedSources) && savedSources.length > 0) {
      setSources(savedSources.map((source) => ({ ...source })));
    } else if (isConfigured && currentBudget > 0) {
      setSources([{ id: 'existing_trip_budget', name: 'Existing Budget', unitAmount: currentBudget, quantity: 1 }]);
    } else {
      setSources([createSource()]);
    }
    setError(null);
    setIsSubmitting(false);
  }, [isBudgetModalOpen, state?.budget?.sources, currentBudget, isConfigured]);

  const total = useMemo(() => sources.reduce((sum, source) => {
    const amount = Number(source.unitAmount);
    const quantity = Number(source.quantity);
    if (!Number.isFinite(amount) || !Number.isFinite(quantity)) return sum;
    return sum + Math.round(amount * 100) * quantity;
  }, 0) / 100, [sources]);

  if (!isBudgetModalOpen) return null;

  const updateSource = (id: string, patch: Partial<BudgetSource>) => {
    setSources((current) => current.map((source) => source.id === id ? { ...source, ...patch } : source));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!sources.length) return setError('Add at least one budget source before saving.');
    if (sources.some((source) => !source.name.trim())) return setError('Please enter a name for every budget source.');
    if (sources.some((source) => !Number.isFinite(Number(source.unitAmount)) || Number(source.unitAmount) <= 0)) return setError('Every source needs an amount greater than ₹0.');
    if (sources.some((source) => !Number.isInteger(Number(source.quantity)) || Number(source.quantity) < 1)) return setError('Every source needs a whole-number quantity of at least 1.');

    setIsSubmitting(true);
    const saved = await updateBudget(sources);
    if (!saved) setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm transition-opacity" onClick={isSubmitting ? undefined : closeBudgetModal} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-cream-300 bg-cream-50 shadow-floating animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bvc-peach/30 text-bvc-red"><Wallet className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-bvc-text sm:text-xl">{isConfigured ? 'Edit Trip Budget' : 'Set Trip Budget'}</h3>
              <p className="text-xs text-bvc-secondary">Shared funding sources for the whole group</p>
            </div>
          </div>
          <button type="button" onClick={closeBudgetModal} disabled={isSubmitting} aria-label="Close budget editor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-200 text-bvc-secondary transition-colors hover:text-bvc-text disabled:opacity-50"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <p className="text-sm leading-relaxed text-bvc-secondary">Add all the places where trip money is coming from. Enter an amount per person or unit and multiply it by the quantity. The shared budget is calculated automatically.</p>

            <section className="rounded-2xl border border-bvc-red/10 bg-gradient-to-r from-red-50 to-rose-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-sm font-bold text-bvc-red">Total Trip Budget</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-bvc-text tabular-nums sm:text-4xl">{formatRupees(total)}</p></div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"><Coins className="h-4 w-4" />Auto-calculated</span>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-extrabold text-bvc-text"><Layers className="h-5 w-5 text-bvc-red" />Budget Breakdown (Sources)</div>
                <span className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-extrabold text-bvc-red tabular-nums">Total: {formatRupees(total)}</span>
              </div>

              <div className="space-y-3">
                {sources.map((source, index) => {
                  const subtotal = Math.round((Number(source.unitAmount) || 0) * 100) * (Number(source.quantity) || 0) / 100;
                  return (
                    <div key={source.id} className="rounded-2xl border border-cream-300 bg-white p-3 sm:p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-extrabold text-bvc-red">{index + 1}</span>
                        <input type="text" value={source.name} onChange={(event) => updateSource(source.id, { name: event.target.value })} maxLength={80} placeholder="Source name (e.g. Personal Contribution)" aria-label={`Budget source ${index + 1} name`} className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-bvc-text outline-none transition focus:border-bvc-red focus:ring-2 focus:ring-bvc-red/10" />
                        <button type="button" onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))} aria-label={`Delete budget source ${index + 1}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-bvc-secondary transition-colors hover:bg-red-50 hover:text-bvc-error"><Trash2 className="h-4 w-4" /></button>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(68px,0.65fr)] items-end gap-2 sm:grid-cols-[minmax(0,1.25fr)_auto_minmax(90px,0.65fr)_auto_minmax(110px,0.8fr)] sm:gap-3">
                        <label className="min-w-0">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-bvc-muted sm:text-xs">Amount each</span>
                          <div className="flex items-center rounded-xl border border-cream-300 bg-white px-2.5 focus-within:border-bvc-red"><span className="mr-1 text-sm font-bold text-bvc-secondary">₹</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={source.unitAmount || ''} onChange={(event) => updateSource(source.id, { unitAmount: Number(event.target.value) })} placeholder="5000" aria-label={`Amount each for ${source.name || `source ${index + 1}`}`} className="w-full min-w-0 bg-transparent py-2.5 text-sm font-semibold text-bvc-text outline-none tabular-nums" /></div>
                        </label>
                        <span className="pb-2.5 text-lg font-semibold text-bvc-muted">×</span>
                        <label className="min-w-0">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-bvc-muted sm:text-xs">Quantity</span>
                          <input type="number" min="1" step="1" inputMode="numeric" value={source.quantity} onChange={(event) => updateSource(source.id, { quantity: Number(event.target.value) })} aria-label={`Quantity for ${source.name || `source ${index + 1}`}`} className="w-full rounded-xl border border-cream-300 bg-white px-2.5 py-2.5 text-center text-sm font-semibold text-bvc-text outline-none transition focus:border-bvc-red tabular-nums" />
                        </label>
                        <span className="hidden pb-2.5 text-lg font-semibold text-bvc-muted sm:block">=</span>
                        <div className="col-span-3 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 sm:col-span-1 sm:block sm:bg-transparent sm:px-0 sm:py-0 sm:text-right"><span className="text-[10px] font-bold uppercase tracking-wide text-bvc-muted sm:hidden">Subtotal</span><span className="text-base font-extrabold text-bvc-red tabular-nums">{formatRupees(subtotal)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button type="button" onClick={() => setSources((current) => [...current, createSource()])} disabled={sources.length >= 30 || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-cream-400 bg-white/70 px-4 py-4 text-sm font-extrabold text-bvc-red transition-colors hover:border-bvc-red hover:bg-red-50 disabled:opacity-50"><Plus className="h-4 w-4" />Add Source</button>
            </section>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-bvc-error">{error}</div>}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-bvc-text">
              <span>Sources: <strong className="text-bvc-red">{sources.length}</strong></span>
              <span>Total Added: <strong className="text-bvc-red tabular-nums">{formatRupees(total)}</strong></span>
            </div>
          </div>

          <div className="border-t border-cream-200 bg-cream-50 px-5 py-4 sm:px-7">
            <button type="submit" disabled={isSubmitting || sources.length === 0} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-bvc-deepRed to-bvc-red py-4 text-sm font-extrabold text-white shadow-redGlow transition-all hover:from-bvc-red hover:to-bvc-redHighlight active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving shared budget...</span></> : <span>{isConfigured ? 'Update Shared Budget' : 'Confirm Trip Budget'}</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
