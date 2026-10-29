'use client';

import React from 'react';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import { VirtualBvcCard } from '@/components/VirtualBvcCard';
import { BudgetSummaryCard } from '@/components/BudgetSummaryCard';
import { CategorySummaryGrid } from '@/components/CategorySummaryGrid';
import { RecentTransactions } from '@/components/RecentTransactions';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { AlertTriangle, CloudOff } from 'lucide-react';

export function Dashboard() {
  const { userName, isLoading, storageStatus } = useTrip();

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header />

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Storage Diagnostic Notice Banner if Blob store is not connected */}
            {storageStatus && !storageStatus.connected && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start space-x-3 text-amber-900 shadow-sm animate-in fade-in">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed flex-1">
                  <p className="font-bold mb-0.5 text-amber-900">
                    {storageStatus.status || 'Vercel Blob Storage Notice'}
                  </p>
                  <p className="text-amber-800">{storageStatus.message}</p>
                  <p className="mt-1.5 text-[11px] text-amber-700">
                    Add <code className="bg-amber-100 text-amber-900 font-mono px-1 py-0.5 rounded">BLOB_READ_WRITE_TOKEN</code> to your <code className="bg-amber-100 text-amber-900 font-mono px-1 py-0.5 rounded">.env.local</code> file to enable live cloud persistence.
                  </p>
                </div>
              </div>
            )}

            {/* Personalized Greeting & Illustrated Group Photo */}
            <div className="pt-1 pb-1 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-bvc-text tracking-tight flex items-center space-x-1.5 truncate">
                  <span className="truncate">Hi {userName || 'Traveler'}!</span>
                  <span className="shrink-0">👋</span>
                </h2>
                <p className="text-xs font-semibold text-bvc-secondary mt-0.5 truncate">
                  Let&apos;s track our adventures
                </p>
              </div>

              {/* Group Illustration Pill */}
              <div className="shrink-0 w-32 h-[58px] min-[360px]:w-36 min-[360px]:h-16 sm:w-48 sm:h-[76px] rounded-[22px] min-[360px]:rounded-[26px] sm:rounded-[30px] overflow-hidden shadow-sm border border-cream-300/70 bg-cream-100 flex items-center justify-center">
                <img
                  src="/images/group_header.png"
                  alt="BVC Trip Friends"
                  className="w-full h-full object-cover object-[center_36%] select-none pointer-events-none"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>

            {/* Virtual Red BVC Card */}
            <VirtualBvcCard />

            {/* Shared Trip Budget Summary */}
            <BudgetSummaryCard />

            {/* 6 Category Summary Grid */}
            <CategorySummaryGrid />

            {/* Recent Operations / Transactions */}
            <RecentTransactions />
          </>
        )}
      </main>
    </div>
  );
}

