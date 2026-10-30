'use client';

import React from 'react';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import { VirtualBvcCard } from '@/components/VirtualBvcCard';
import { BudgetSummaryCard } from '@/components/BudgetSummaryCard';
import { CategorySummaryGrid } from '@/components/CategorySummaryGrid';
import { RecentTransactions } from '@/components/RecentTransactions';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { InstallAppBanner } from '@/components/InstallAppBanner';
import { AlertTriangle } from 'lucide-react';

export function Dashboard() {
  const { userName, isLoading, storageStatus } = useTrip();

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header />

      <main className="max-w-lg mx-auto px-4 pt-0 space-y-4">
        {isLoading ? (
          <div className="pt-4">
            <LoadingSkeleton />
          </div>
        ) : (
          <>
            {/* Storage diagnostic notice remains available without interrupting the dashboard. */}
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

            {/* Sunset greeting hero — preserves the existing BVC friends group image. */}
            <section className="dashboard-sunset-hero relative -mx-4 overflow-hidden px-4 py-5 sm:py-6">
              <div className="dashboard-hero-sun" aria-hidden="true" />
              <div className="dashboard-hero-horizon" aria-hidden="true" />
              <div className="relative z-10 flex min-h-[124px] items-center justify-between gap-3">
                <div className="min-w-0 flex-1 text-white">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center space-x-1.5 drop-shadow-sm">
                    <span className="truncate">Hi {userName || 'Traveler'}!</span>
                    <span className="shrink-0">👋</span>
                  </h2>
                  <p className="text-xs font-semibold mt-0.5 text-white/90">
                    Let&apos;s track our adventures
                  </p>
                  <p className="dashboard-hero-tagline">Good Trips · Better People ♡</p>
                </div>

                <div className="shrink-0 w-[44%] max-w-[210px] h-[108px] min-[380px]:h-[120px] rounded-[24px] sm:rounded-[28px] overflow-hidden border-[3px] border-white/85 shadow-[0_10px_28px_rgba(45,28,35,0.22)] bg-white/20">
                  <img
                    src="/images/group_header.png"
                    alt="BVC Trip Friends"
                    className="w-full h-full object-cover object-[center_36%] select-none pointer-events-none"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793306702/7d99a727-005c-419d-97da-794a0b896691_bzogks.png';
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Existing install flow, now styled as a translucent glass panel. */}
            <InstallAppBanner />

            {/* Shared BVC balance card */}
            <VirtualBvcCard />

            {/* Budget, categories and transactions retain their existing live data and actions. */}
            <BudgetSummaryCard />
            <CategorySummaryGrid />
            <RecentTransactions />
          </>
        )}
      </main>
    </div>
  );
}
