'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTrip } from '@/lib/trip-context';
import { Expense, ExpenseCategory } from '@/types';
import {
  Utensils,
  Bed,
  Car,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  Receipt,
} from 'lucide-react';

const CATEGORY_MAP: Record<
  ExpenseCategory,
  { icon: React.ElementType; color: string; bg: string }
> = {
  Food: { icon: Utensils, color: '#E24A4A', bg: '#FDF2F2' },
  Stay: { icon: Bed, color: '#8A74D4', bg: '#F3F0FC' },
  Transport: { icon: Car, color: '#4A94E8', bg: '#EDF5FD' },
  Activities: { icon: Ticket, color: '#E65C8C', bg: '#FDF0F5' },
  Shopping: { icon: ShoppingBag, color: '#EFA43A', bg: '#FEF7EE' },
  Others: { icon: MoreHorizontal, color: '#8E8994', bg: '#F4F3F5' },
};

function formatTransactionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return `Today, ${timeStr}`;

    const dateOnly = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
    return `${dateOnly}, ${timeStr}`;
  } catch {
    return dateStr;
  }
}

export function RecentTransactions() {
  const { state, openAddExpense, promptDeleteExpense } = useTrip();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const expenses = state?.expenses || [];
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="w-full bg-white rounded-3xl p-5 border border-cream-300 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-bvc-text">Operations</h3>
        <Link
          href="/transactions"
          className="text-xs font-semibold text-bvc-red hover:underline flex items-center space-x-1"
        >
          <span>Full records</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Transaction List */}
      {recentExpenses.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-bvc-muted mb-3">
            <Receipt className="w-6 h-6 stroke-[1.5]" />
          </div>
          <p className="text-sm font-bold text-bvc-text mb-1">No operations recorded</p>
          <p className="text-xs text-bvc-secondary max-w-xs mb-4">
            Shared expenses recorded by any member will appear here in real time.
          </p>
          <button
            type="button"
            onClick={() => openAddExpense()}
            className="px-4 py-2 rounded-xl bg-bvc-red text-white text-xs font-bold shadow-sm hover:bg-bvc-deepRed transition-colors"
          >
            + Add Expense
          </button>
        </div>
      ) : (
        <div className="divide-y divide-cream-200">
          {recentExpenses.map((expense) => {
            const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP.Others;
            const Icon = cat.icon;
            const isMenuOpen = activeMenuId === expense.id;

            return (
              <div
                key={expense.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between relative group"
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cat.bg, color: cat.color }}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-bvc-text truncate leading-tight">
                      {expense.purpose}
                    </p>
                    <p className="text-[11px] text-bvc-secondary truncate mt-0.5">
                      {formatTransactionDate(expense.date)} · by{' '}
                      <span className="font-semibold text-bvc-text">{expense.paidBy}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Three-dot menu */}
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-sm font-extrabold text-bvc-text tabular-nums">
                    ₹ {expense.amount.toLocaleString('en-IN')}
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : expense.id)}
                      className="w-7 h-7 rounded-full hover:bg-cream-200 flex items-center justify-center text-bvc-secondary hover:text-bvc-text transition-colors"
                      aria-label="Actions"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Popover action menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-32 bg-white rounded-2xl shadow-floating border border-cream-300 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            openAddExpense(expense);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-bvc-text hover:bg-cream-100 flex items-center space-x-2 text-left"
                        >
                          <Pencil className="w-3.5 h-3.5 text-bvc-secondary" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            promptDeleteExpense(expense);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-bvc-error hover:bg-red-50 flex items-center space-x-2 text-left font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-bvc-error" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
