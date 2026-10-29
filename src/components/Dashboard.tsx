'use client';

import React from 'react';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import { VirtualBvcCard } from '@/components/VirtualBvcCard';
import { BudgetSummaryCard } from '@/components/BudgetSummaryCard';
import { CategorySummaryGrid } from '@/components/CategorySummaryGrid';
import { RecentTransactions } from '@/components/RecentTransactions';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export function Dashboard() {
  const { userName, isLoading } = useTrip();

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header />

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Personalized Greeting */}
            <div className="pt-1 pb-1">
              <h2 className="text-2xl font-extrabold text-bvc-text tracking-tight flex items-center space-x-1.5">
                <span>Hi {userName || 'Traveler'}!</span>
                <span>👋</span>
              </h2>
              <p className="text-xs font-semibold text-bvc-secondary mt-0.5">
                Let&apos;s track our adventures
              </p>
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
