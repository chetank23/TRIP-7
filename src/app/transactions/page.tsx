'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import { Expense, ExpenseCategory } from '@/types';
import {
  Search,
  Utensils,
  Bed,
  Car,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Trash2,
  Receipt,
  Plus,
} from 'lucide-react';

const CATEGORIES: ('All' | ExpenseCategory)[] = [
  'All',
  'Food',
  'Stay',
  'Transport',
  'Activities',
  'Shopping',
  'Others',
];

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

function getDateHeader(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as ExpenseCategory) || 'All';

  const { state, openAddExpense, promptDeleteExpense } = useTrip();
  const [selectedCategory, setSelectedCategory] = useState<'All' | ExpenseCategory>(
    CATEGORIES.includes(initialCategory) ? initialCategory : 'All'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const expenses = state?.expenses || [];

  // Filter and search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Category filter
      if (selectedCategory !== 'All' && exp.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPurpose = exp.purpose.toLowerCase().includes(q);
        const matchesPayer = exp.paidBy.toLowerCase().includes(q);
        const matchesCategory = exp.category.toLowerCase().includes(q);
        return matchesPurpose || matchesPayer || matchesCategory;
      }
      return true;
    });
  }, [expenses, selectedCategory, searchQuery]);

  // Group by date
  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};
    for (const exp of filteredExpenses) {
      const header = getDateHeader(exp.date);
      if (!groups[header]) groups[header] = [];
      groups[header].push(exp);
    }
    return groups;
  }, [filteredExpenses]);

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header
        title="Transactions"
        showBack
        rightAction={
          <button
            type="button"
            onClick={() => openAddExpense()}
            className="w-9 h-9 rounded-full bg-bvc-red text-white flex items-center justify-center shadow-sm hover:bg-bvc-deepRed transition-colors"
            title="Add Expense"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <main className="max-w-lg mx-auto px-4 pt-3 space-y-4">
        {/* Category Filter Pills (Screen 4) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-bvc-red text-white shadow-sm'
                    : 'bg-white text-bvc-secondary border border-cream-300 hover:text-bvc-text hover:border-cream-400'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative rounded-2xl bg-white border border-cream-300 px-3.5 py-2.5 flex items-center focus-within:ring-2 focus-within:ring-bvc-red/20 focus-within:border-bvc-red shadow-sm transition-all">
          <Search className="w-4 h-4 text-bvc-muted mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm font-medium text-bvc-text placeholder:text-bvc-muted bg-transparent outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-bvc-secondary hover:text-bvc-text px-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Transaction Grouped List */}
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-cream-300 text-center shadow-card flex flex-col items-center justify-center my-4">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-bvc-muted mb-3">
              <Receipt className="w-6 h-6 stroke-[1.6]" />
            </div>
            <h3 className="text-sm font-bold text-bvc-text mb-1">
              {searchQuery ? 'No matching expenses found' : 'No expenses recorded yet'}
            </h3>
            <p className="text-xs text-bvc-secondary max-w-xs mb-4">
              {searchQuery
                ? `Try adjusting your search query "${searchQuery}" or selected category.`
                : 'Every expense recorded by you or your group will appear here with instant audit tracking.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => openAddExpense()}
                className="px-4 py-2 rounded-xl bg-bvc-red text-white text-xs font-bold shadow-sm hover:bg-bvc-deepRed transition-colors"
              >
                + Add Expense
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedExpenses).map(([dateGroup, items]) => (
            <div key={dateGroup} className="space-y-2">
              <h3 className="text-xs font-bold text-bvc-secondary px-1 uppercase tracking-wider">
                {dateGroup}
              </h3>

              <div className="bg-white rounded-3xl p-4 border border-cream-300 shadow-card divide-y divide-cream-200">
                {items.map((expense) => {
                  const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP.Others;
                  const Icon = cat.icon;
                  const isMenuOpen = activeMenuId === expense.id;

                  return (
                    <div
                      key={expense.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between relative group"
                    >
                      {/* Left: Icon & Purpose */}
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
                            {formatTime(expense.date)} · by{' '}
                            <span className="font-semibold text-bvc-text">
                              {expense.paidBy}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount & Menu */}
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
            </div>
          ))
        )}
      </main>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bvc-bg flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-bvc-red border-t-transparent animate-spin" />
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}

