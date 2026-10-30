'use client';

import React, { useState, useMemo } from 'react';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import { MemberSpendingSummary } from '@/components/MemberSpendingSummary';
import { ExpenseCategory } from '@/types';
import {
  Utensils,
  Bed,
  Car,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface CategoryConfig {
  key: ExpenseCategory;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'Food', label: 'Food', icon: Utensils, color: '#E24A4A', bg: '#FDF2F2' },
  { key: 'Stay', label: 'Stay', icon: Bed, color: '#8A74D4', bg: '#F3F0FC' },
  { key: 'Transport', label: 'Transport', icon: Car, color: '#4A94E8', bg: '#EDF5FD' },
  { key: 'Activities', label: 'Activities', icon: Ticket, color: '#E65C8C', bg: '#FDF0F5' },
  { key: 'Shopping', label: 'Shopping', icon: ShoppingBag, color: '#EFA43A', bg: '#FEF7EE' },
  { key: 'Others', label: 'Others', icon: MoreHorizontal, color: '#8E8994', bg: '#F4F3F5' },
];

export default function AnalyticsPage() {
  const { state, totalSpent, categorySpending, spentPercentage } = useTrip();
  const [timeRange, setTimeRange] = useState<'30' | '7' | 'all'>('30');

  // Filter expenses by selected time range
  const filteredExpenses = useMemo(() => {
    const expenses = state?.expenses || [];
    if (timeRange === 'all') return expenses;
    const days = timeRange === '7' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return expenses.filter((exp) => {
      try {
        const d = new Date(exp.date);
        return d >= cutoff;
      } catch {
        return true;
      }
    });
  }, [state?.expenses, timeRange]);

  // Recalculate totals for active range
  const rangeTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const rangeCategorySpending = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = {
      Food: 0,
      Stay: 0,
      Transport: 0,
      Activities: 0,
      Shopping: 0,
      Others: 0,
    };
    for (const exp of filteredExpenses) {
      if (totals[exp.category] !== undefined) {
        totals[exp.category] += Number(exp.amount) || 0;
      } else {
        totals.Others += Number(exp.amount) || 0;
      }
    }
    return totals;
  }, [filteredExpenses]);

  // Daily expenditure distribution
  const dailyChartData = useMemo(() => {
    if (filteredExpenses.length === 0) return [];

    const map: { [day: string]: number } = {};
    const sorted = [...filteredExpenses].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const exp of sorted) {
      try {
        const d = new Date(exp.date);
        const dayLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        map[dayLabel] = (map[dayLabel] || 0) + Number(exp.amount);
      } catch {}
    }

    const items = Object.entries(map).map(([date, amount]) => ({ date, amount }));
    return items.slice(-10); // Display up to last 10 active days
  }, [filteredExpenses]);

  const maxDailyAmount = useMemo(() => {
    if (dailyChartData.length === 0) return 1000;
    return Math.max(...dailyChartData.map((d) => d.amount), 500);
  }, [dailyChartData]);

  // Donut chart SVG slices calculations
  const donutSlices = useMemo(() => {
    if (rangeTotal === 0) return [];
    let cumulativeAngle = 0;
    const slices = [];

    for (const cat of CATEGORIES) {
      const amount = rangeCategorySpending[cat.key];
      if (amount <= 0) continue;
      const pct = amount / rangeTotal;
      const angle = pct * 360;

      // Arc coordinates
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle += angle;

      const x1 = 50 + 38 * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y1 = 50 + 38 * Math.sin((Math.PI * (startAngle - 90)) / 180);
      const x2 = 50 + 38 * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y2 = 50 + 38 * Math.sin((Math.PI * (endAngle - 90)) / 180);
      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = `M 50 50 L ${x1} ${y1} A 38 38 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      slices.push({
        category: cat.key,
        color: cat.color,
        path: pathData,
        percentage: Math.round(pct * 100),
        amount,
      });
    }

    return slices;
  }, [rangeTotal, rangeCategorySpending]);

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header
        title="Analytics"
        showBack
        rightAction={
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '30' | '7' | 'all')}
              className="text-xs font-semibold bg-white border border-cream-300 rounded-full px-3 py-1.5 text-bvc-text focus:outline-none focus:ring-1 focus:ring-bvc-red appearance-none pr-6 shadow-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="all">Entire Trip</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-bvc-muted text-[10px]">
              ▼
            </div>
          </div>
        }
      />

      <main className="max-w-lg mx-auto px-4 pt-3 space-y-4">
        {rangeTotal === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-cream-300 text-center shadow-card flex flex-col items-center justify-center my-6">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-bvc-muted mb-3">
              <TrendingUp className="w-6 h-6 stroke-[1.6]" />
            </div>
            <h3 className="text-sm font-bold text-bvc-text mb-1">No spending data to analyze</h3>
            <p className="text-xs text-bvc-secondary max-w-xs leading-relaxed mb-4">
              Add your group expenses to unlock visual spending charts, daily burn rates, and category distribution.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Spending Overview (Donut Chart & Legend) */}
            <div className="w-full bg-white rounded-3xl p-5 border border-cream-300 shadow-card">
              <h3 className="text-sm font-bold text-bvc-text mb-4">Spending Overview</h3>

              <div className="flex items-center justify-between">
                {/* SVG Donut */}
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {donutSlices.map((slice) => (
                      <path
                        key={slice.category}
                        d={slice.path}
                        fill={slice.color}
                        className="transition-all duration-300 hover:opacity-90"
                      />
                    ))}
                    {/* Inner hole mask */}
                    <circle cx="50" cy="50" r="26" fill="#FFFFFF" />
                  </svg>

                  {/* Centered Total inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-black text-bvc-text tabular-nums">
                      ₹ {rangeTotal >= 100000 ? `${(rangeTotal / 1000).toFixed(0)}k` : rangeTotal.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold text-bvc-secondary">
                      {spentPercentage}%
                    </span>
                  </div>
                </div>

                {/* Legend on the right */}
                <div className="flex-1 pl-4 space-y-1.5">
                  {CATEGORIES.map((cat) => {
                    const amount = rangeCategorySpending[cat.key];
                    const pct = rangeTotal > 0 ? Math.round((amount / rangeTotal) * 100) : 0;

                    return (
                      <div key={cat.key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-bvc-secondary truncate font-medium">
                            {cat.label}
                          </span>
                        </div>
                        <span className="font-bold text-bvc-text tabular-nums ml-2">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Daily Expenditure Bar Chart */}
            {dailyChartData.length > 0 && (
              <div className="w-full bg-white rounded-3xl p-5 border border-cream-300 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-bvc-text">Daily Expenditure</h3>
                  <span className="text-[11px] text-bvc-secondary font-medium">
                    Peak ₹ {maxDailyAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Bar chart canvas */}
                <div className="h-32 flex items-end justify-between gap-2 pt-4 pb-2 border-b border-cream-200">
                  {dailyChartData.map((bar, idx) => {
                    const heightPercent = Math.max((bar.amount / maxDailyAmount) * 100, 8);
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-7 hidden group-hover:flex bg-bvc-text text-white text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10 tabular-nums">
                          ₹{bar.amount.toLocaleString('en-IN')}
                        </div>

                        {/* Bar */}
                        <div
                          className="w-full max-w-[20px] rounded-t-lg bg-gradient-to-t from-bvc-red to-bvc-redHighlight group-hover:from-bvc-deepRed group-hover:to-bvc-red transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-axis labels */}
                <div className="flex items-center justify-between pt-2">
                  {dailyChartData.map((bar, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] text-bvc-muted truncate text-center flex-1"
                    >
                      {bar.date}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Category Breakdown List */}
            <div className="w-full bg-white rounded-3xl p-5 border border-cream-300 shadow-card">
              <h3 className="text-sm font-bold text-bvc-text mb-4">Category Breakdown</h3>

              <div className="space-y-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const amount = rangeCategorySpending[cat.key];
                  const pct = rangeTotal > 0 ? Math.round((amount / rangeTotal) * 100) : 0;

                  return (
                    <div key={cat.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.bg, color: cat.color }}
                          >
                            <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                          </div>
                          <span className="font-bold text-bvc-text">{cat.label}</span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="font-extrabold text-bvc-text tabular-nums">
                            ₹ {amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] font-semibold text-bvc-secondary w-8 text-right tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Progress line */}
                      <div className="w-full h-1.5 bg-cream-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 4. Who Paid How Much Section */}
        <MemberSpendingSummary />
      </main>
    </div>
  );
}

