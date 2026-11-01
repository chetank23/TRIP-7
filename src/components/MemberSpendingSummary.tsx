'use client';

import React, { useState } from 'react';
import { useTrip } from '@/lib/trip-context';
import { Users, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { FRIEND_PROFILES } from '@/lib/profiles';

function formatExpenseDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MemberSpendingSummary() {
  const { memberSpending, totalSpent, state } = useTrip();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const getMemberExpenses = (memberName: string) => {
    const normalizedName = memberName.trim().toLocaleLowerCase('en-IN');
    return (state?.expenses || [])
      .filter((expense) => {
        const paidBy = (expense.paidBy || '').trim().toLocaleLowerCase('en-IN');
        return Boolean(paidBy) && (
          paidBy === normalizedName ||
          paidBy.startsWith(normalizedName) ||
          normalizedName.startsWith(paidBy)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // 6-member equal share target
  const equalShareFor6 = totalSpent > 0 ? Math.round(totalSpent / 6) : 0;

  // Find profile photo / metadata if available
  const getProfileMeta = (name: string) => {
    return (
      FRIEND_PROFILES.find((p) => p.name.toLowerCase() === name.toLowerCase()) || {
        initials: name.slice(0, 2).toUpperCase(),
        photoUrl: '',
      }
    );
  };

  return (
    <div className="w-full bg-white rounded-3xl p-5 border border-cream-300 shadow-card space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-bvc-peach/30 text-bvc-red flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-bvc-text tracking-tight">
              Who Paid How Much
            </h3>
            <p className="text-[11px] font-medium text-bvc-secondary mt-0.5">
              Individual contributions across the trip
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-black text-bvc-text tabular-nums block">
            ₹ {totalSpent.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-bvc-secondary font-semibold">Total Paid</span>
        </div>
      </div>

      {/* Target Share Badge (6 Members Rule) */}
      {totalSpent > 0 && (
        <div className="p-3 rounded-2xl bg-[#FFF9F6] border border-[#FDE5DC] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-bvc-red animate-pulse" />
            <span className="text-xs font-bold text-bvc-text">
              Target Equal Share (6 members)
            </span>
          </div>
          <span className="text-xs font-black text-bvc-deepRed tabular-nums">
            ₹ {equalShareFor6.toLocaleString('en-IN')}{' '}
            <span className="text-[10px] font-medium text-bvc-secondary">/ person</span>
          </span>
        </div>
      )}

      {/* Members Contribution List */}
      <div className="divide-y divide-cream-200">
        {memberSpending.map((member, idx) => {
          const meta = getProfileMeta(member.name);
          const isTopPayer = idx === 0 && member.totalPaid > 0;
          const isVyshnavi = member.name.toLowerCase().includes('vysh');
          const balance = member.totalPaid - equalShareFor6;
          const isExpanded = expandedMember === member.name;
          const memberExpenses = getMemberExpenses(member.name);
          const detailsId = `member-expenses-${idx}`;

          return (
            <div key={member.name} className="py-3 first:pt-1 last:pb-1 space-y-1.5">
              <button
                type="button"
                onClick={() => setExpandedMember((current) => current === member.name ? null : member.name)}
                aria-expanded={isExpanded}
                aria-controls={detailsId}
                aria-label={`Show expenses paid by ${member.name}`}
                className="flex w-full items-center justify-between gap-2 rounded-xl text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-bvc-red/40"
              >
                {/* Left: Avatar & Member Name */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative">
                    {meta.photoUrl ? (
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-cream-200 bg-cream-100 shrink-0">
                        <img
                          src={meta.photoUrl}
                          alt={member.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-bvc-red to-bvc-peach text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {meta.initials}
                      </div>
                    )}

                    {isTopPayer && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                        <Crown className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                      <span className="text-xs font-bold text-bvc-text truncate">
                        {member.name}
                      </span>
                      {isTopPayer && (
                        <span className="text-[9px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                          Top Payer
                        </span>
                      )}
                      {isVyshnavi && (
                        <span className="text-[9px] font-extrabold text-pink-700 bg-pink-50 px-1.5 py-0.2 rounded-full border border-pink-200 shrink-0">
                          WE MISS YOU VYSHH ❤️
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-bvc-secondary font-medium block">
                      {isVyshnavi
                        ? 'Always with us...'
                        : member.expenseCount === 0
                          ? 'No expenses paid'
                          : `${member.expenseCount} payment${member.expenseCount === 1 ? '' : 's'}`}
                    </span>
                  </div>
                </div>

                {/* Right: Total Amount, Percentage & Expand Indicator */}
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                  {isVyshnavi ? (
                    <div>
                      <span className="text-sm font-black text-pink-600 block leading-tight tracking-wide">
                        ₹ ∞
                      </span>
                      <span className="text-[10px] font-bold text-pink-500 block mt-0.5">
                        (Miss you Vyshh!)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-extrabold text-bvc-text tabular-nums block">
                        ₹ {member.totalPaid.toLocaleString('en-IN')}
                      </span>
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-[10px] font-semibold text-bvc-secondary tabular-nums">
                          {member.percentage}%
                        </span>
                        {totalSpent > 0 && (
                          <span
                            className={`text-[9px] font-bold ${
                              balance >= 0 ? 'text-emerald-700' : 'text-bvc-muted'
                            }`}
                          >
                            {balance > 0 ? `(+₹${balance.toLocaleString('en-IN')})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-100 text-bvc-secondary">
                    {isExpanded
                      ? <ChevronUp className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                </div>
              </button>

              {/* Relative Progress Bar */}
              <div className="w-full h-1.5 bg-cream-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isVyshnavi
                      ? 'bg-gradient-to-r from-pink-300 via-rose-300 to-pink-400'
                      : isTopPayer
                        ? 'bg-gradient-to-r from-bvc-deepRed to-bvc-red'
                        : member.totalPaid > 0
                          ? 'bg-bvc-red/80'
                          : 'bg-transparent'
                  }`}
                  style={{
                    width: isVyshnavi
                      ? '100%'
                      : `${Math.max(member.percentage, member.totalPaid > 0 ? 5 : 0)}%`,
                  }}
                />
              </div>

              {isExpanded && (
                <div
                  id={detailsId}
                  className="mt-3 rounded-2xl border border-cream-200 bg-cream-50/70 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-bvc-secondary">
                      Payments by {member.name}
                    </span>
                    <span className="text-xs font-black tabular-nums text-bvc-text">
                      ₹ {memberExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {memberExpenses.length > 0 ? (
                    <div className="divide-y divide-cream-200">
                      {memberExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-start justify-between gap-3 py-2 first:pt-1 last:pb-1">
                          <div className="min-w-0">
                            <p className="break-words text-xs font-semibold text-bvc-text">
                              {expense.purpose || 'Untitled expense'}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium text-bvc-secondary">
                              {expense.category} · {formatExpenseDate(expense.date)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-extrabold tabular-nums text-bvc-text">
                            ₹ {Number(expense.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-[11px] font-medium text-bvc-secondary">
                      No individual payments recorded for {member.name}.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

