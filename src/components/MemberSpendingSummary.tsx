'use client';

import React from 'react';
import { useTrip } from '@/lib/trip-context';
import { Users, Crown, ArrowUpRight } from 'lucide-react';
import { FRIEND_PROFILES } from '@/lib/profiles';

export function MemberSpendingSummary() {
  const { memberSpending, totalSpent } = useTrip();

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
          const balance = member.totalPaid - equalShareFor6;

          return (
            <div key={member.name} className="py-3 first:pt-1 last:pb-1 space-y-1.5">
              <div className="flex items-center justify-between">
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
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-bvc-text truncate">
                        {member.name}
                      </span>
                      {isTopPayer && (
                        <span className="text-[9px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                          Top Payer
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-bvc-secondary font-medium block">
                      {member.expenseCount === 0
                        ? 'No expenses paid'
                        : `${member.expenseCount} payment${member.expenseCount === 1 ? '' : 's'}`}
                    </span>
                  </div>
                </div>

                {/* Right: Total Amount & Percentage */}
                <div className="text-right shrink-0">
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
              </div>

              {/* Relative Progress Bar */}
              <div className="w-full h-1.5 bg-cream-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTopPayer
                      ? 'bg-gradient-to-r from-bvc-deepRed to-bvc-red'
                      : member.totalPaid > 0
                      ? 'bg-bvc-red/80'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${Math.max(member.percentage, member.totalPaid > 0 ? 5 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
