'use client';

import React, { useState, useEffect } from 'react';
import { useTrip } from '@/lib/trip-context';
import { ExpenseCategory } from '@/types';
import {
  X,
  Utensils,
  Bed,
  Car,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  Calendar,
  Users,
  IndianRupee,
  Loader2,
} from 'lucide-react';

const CATEGORIES: { label: ExpenseCategory; icon: React.ElementType; color: string; bg: string }[] = [
  { label: 'Food', icon: Utensils, color: '#E24A4A', bg: '#FDF2F2' },
  { label: 'Stay', icon: Bed, color: '#8A74D4', bg: '#F3F0FC' },
  { label: 'Transport', icon: Car, color: '#4A94E8', bg: '#EDF5FD' },
  { label: 'Activities', icon: Ticket, color: '#E65C8C', bg: '#FDF0F5' },
  { label: 'Shopping', icon: ShoppingBag, color: '#EFA43A', bg: '#FEF7EE' },
  { label: 'Others', icon: MoreHorizontal, color: '#8E8994', bg: '#F4F3F5' },
];

export function AddExpenseSheet() {
  const {
    isAddExpenseOpen,
    closeAddExpense,
    editingExpense,
    saveExpense,
    userName,
    state,
  } = useTrip();

  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [paidBy, setPaidBy] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [splitMode, setSplitMode] = useState<'6_members' | 'custom' | 'none'>('6_members');
  const [customSplitMembers, setCustomSplitMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Group members
  const DEFAULT_MEMBERS = [
    'Chetan K',
    'Adithi',
    'Harshitha',
    'Dharma',
    'Lavanya',
    'Rohith',
    'Vyshnavi',
  ];
  const members =
    state?.members && state.members.length > 0 ? state.members : DEFAULT_MEMBERS;

  // Initialize or reset form values
  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setPurpose(editingExpense.purpose);
      setCategory(editingExpense.category);
      setPaidBy(editingExpense.paidBy);
      // Format to datetime-local string
      try {
        const d = new Date(editingExpense.date);
        setDate(d.toISOString().slice(0, 16));
      } catch {
        setDate(new Date().toISOString().slice(0, 16));
      }
      const sw = editingExpense.splitWith || '';
      if (sw.includes('No Split') || sw.includes('Personal')) {
        setSplitMode('none');
      } else if (sw.includes('Custom') || sw.includes('friends')) {
        setSplitMode('custom');
        setCustomSplitMembers(members.slice(0, 6));
      } else {
        setSplitMode('6_members');
      }
    } else {
      setAmount('');
      setPurpose('');
      setCategory('Food');
      setPaidBy(userName || (members[0] ?? 'Chetan K'));
      // Current local date/time for datetime-local input
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDate(localIso);
      setSplitMode('6_members');
      setCustomSplitMembers(members.slice(0, 6));
    }
    setFormError(null);
  }, [editingExpense, isAddExpenseOpen, userName, members]);

  if (!isAddExpenseOpen) return null;

  const handleQuickAdd = (value: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    if (!purpose.trim()) {
      setFormError('Please describe the purpose (e.g. Dinner at Cafe)');
      return;
    }

    if (!paidBy.trim()) {
      setFormError('Please select who paid for this expense');
      return;
    }

    setIsSubmitting(true);
    const splitCount =
      splitMode === '6_members'
        ? 6
        : splitMode === 'custom'
        ? Math.max(customSplitMembers.length, 1)
        : 1;
    const perPerson = numAmount > 0 ? Math.round(numAmount / splitCount) : 0;
    const finalSplitWith =
      splitMode === '6_members'
        ? `Split across 6 members (₹${perPerson.toLocaleString('en-IN')}/each)`
        : splitMode === 'custom'
        ? `Custom split: ${customSplitMembers.length} members (₹${perPerson.toLocaleString('en-IN')}/each)`
        : 'Personal Expense (No Split)';

    const success = await saveExpense({
      amount: numAmount,
      purpose: purpose.trim(),
      category,
      paidBy: paidBy.trim(),
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      splitWith: finalSplitWith,
    });

    setIsSubmitting(false);
    if (!success) {
      // Error message is shown via toast in context
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Soft blurred backdrop */}
      <div
        className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm transition-opacity"
        onClick={closeAddExpense}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-cream-50 sm:rounded-3xl rounded-t-3xl shadow-sheet sm:shadow-floating border border-cream-300 max-h-[92vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-300">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-cream-300 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
          <h2 className="text-lg font-bold text-bvc-text">
            {editingExpense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            type="button"
            onClick={closeAddExpense}
            className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-bvc-secondary hover:text-bvc-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 text-bvc-error text-xs rounded-xl border border-red-200">
              {formError}
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-bvc-secondary uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <div className="relative rounded-2xl bg-white border border-cream-300 px-4 py-3 flex items-center focus-within:ring-2 focus-within:ring-bvc-red/20 focus-within:border-bvc-red transition-all">
              <span className="text-2xl font-bold text-bvc-secondary mr-2">₹</span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus={!editingExpense}
                className="w-full text-3xl font-extrabold text-bvc-text placeholder:text-cream-400 bg-transparent outline-none tabular-nums"
              />
            </div>

            {/* Quick amount suggestion chips */}
            <div className="flex items-center gap-2 mt-2.5">
              {[100, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-white border border-cream-300 text-bvc-secondary hover:border-bvc-red hover:text-bvc-red active:scale-95 transition-all"
                >
                  + ₹{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Purpose / Description */}
          <div>
            <label className="block text-xs font-semibold text-bvc-secondary uppercase tracking-wider mb-1.5">
              Purpose / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Dinner at Cafe"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-cream-300 text-sm font-medium text-bvc-text placeholder:text-bvc-muted focus:outline-none focus:ring-2 focus:ring-bvc-red/20 focus:border-bvc-red transition-all"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-bvc-secondary uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setCategory(cat.label)}
                    className={`flex items-center space-x-2 p-2.5 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'border-bvc-red bg-bvc-redLight shadow-sm ring-1 ring-bvc-red'
                        : 'border-cream-300 bg-white hover:bg-cream-100'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat.bg, color: cat.color }}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />
                    </div>
                    <span
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-bvc-red' : 'text-bvc-text'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label className="block text-xs font-semibold text-bvc-secondary uppercase tracking-wider mb-1.5">
              Paid by
            </label>
            <div className="relative">
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-cream-300 text-sm font-medium text-bvc-text focus:outline-none focus:ring-2 focus:ring-bvc-red/20 focus:border-bvc-red appearance-none pr-10"
              >
                {members.map((member) => (
                  <option key={member} value={member}>
                    {member} {member === userName ? '(You)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-bvc-muted">
                ▼
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div>
            <label className="block text-xs font-semibold text-bvc-secondary uppercase tracking-wider mb-1.5">
              Date & Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-cream-300 text-sm font-medium text-bvc-text focus:outline-none focus:ring-2 focus:ring-bvc-red/20 focus:border-bvc-red"
              />
            </div>
          </div>

          {/* Split Sharing Option (6 Members Rule & Live Calculation) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-bvc-secondary uppercase tracking-wider">
                Split Sharing Option
              </label>
              <span className="text-[10px] font-bold text-bvc-deepRed bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                6 Members Rule
              </span>
            </div>

            {/* Split Mode Selector Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSplitMode('6_members')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                  splitMode === '6_members'
                    ? 'bg-bvc-red text-white border-bvc-red shadow-sm'
                    : 'bg-white text-bvc-text border-cream-300 hover:bg-cream-50'
                }`}
              >
                6 Members
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitMode('custom');
                  if (customSplitMembers.length === 0) {
                    setCustomSplitMembers(members.slice(0, 6));
                  }
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                  splitMode === 'custom'
                    ? 'bg-bvc-red text-white border-bvc-red shadow-sm'
                    : 'bg-white text-bvc-text border-cream-300 hover:bg-cream-50'
                }`}
              >
                Custom Split
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('none')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                  splitMode === 'none'
                    ? 'bg-bvc-red text-white border-bvc-red shadow-sm'
                    : 'bg-white text-bvc-text border-cream-300 hover:bg-cream-50'
                }`}
              >
                No Split
              </button>
            </div>

            {/* Live Calculation Display Card */}
            {splitMode !== 'none' && (
              <div className="p-3.5 rounded-2xl bg-[#FFF9F6] border border-[#FDE5DC] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-bvc-peach/30 text-bvc-red flex items-center justify-center font-black text-xs shrink-0">
                    {splitMode === '6_members' ? 6 : Math.max(customSplitMembers.length, 1)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-bvc-text block leading-tight">
                      {splitMode === '6_members'
                        ? 'Equal 6-Member Split'
                        : `Split with ${customSplitMembers.length} friends`}
                    </span>
                    <span className="text-[10px] text-bvc-secondary font-medium">
                      {Number(amount) > 0
                        ? `₹ ${Number(amount).toLocaleString('en-IN')} ÷ ${
                            splitMode === '6_members' ? 6 : Math.max(customSplitMembers.length, 1)
                          } members`
                        : 'Enter amount to see per-person share'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-bvc-deepRed tabular-nums block">
                    ₹{' '}
                    {Number(amount) > 0
                      ? Math.round(
                          Number(amount) /
                            (splitMode === '6_members'
                              ? 6
                              : Math.max(customSplitMembers.length, 1))
                        ).toLocaleString('en-IN')
                      : 0}
                  </span>
                  <span className="text-[10px] text-bvc-muted font-medium">per person</span>
                </div>
              </div>
            )}

            {/* Custom Split Member Picker */}
            {splitMode === 'custom' && (
              <div className="pt-1.5 space-y-1.5">
                <span className="text-[10px] font-bold text-bvc-secondary uppercase tracking-wider block">
                  Select friends included in this split ({customSplitMembers.length} selected):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const isIncluded = customSplitMembers.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (isIncluded) {
                            if (customSplitMembers.length > 1) {
                              setCustomSplitMembers(customSplitMembers.filter((x) => x !== m));
                            }
                          } else {
                            setCustomSplitMembers([...customSplitMembers, m]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                          isIncluded
                            ? 'bg-bvc-deepRed text-white border-bvc-deepRed shadow-xs'
                            : 'bg-white text-bvc-secondary border-cream-300 hover:bg-cream-50'
                        }`}
                      >
                        {m} {m === 'Vyshnavi' ? '(Miss you Vyshh!)' : isIncluded ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-6 sm:pb-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-bvc-deepRed to-bvc-red hover:from-bvc-red hover:to-bvc-redHighlight text-white text-base font-bold shadow-redGlow active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving to shared trip...</span>
                </>
              ) : (
                <span>{editingExpense ? 'Update Expense' : 'Add Expense'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

