'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ReceiptText, Plus, BarChart2, FolderArchive } from 'lucide-react';
import { useTrip } from '@/lib/trip-context';

export function Navigation() {
  const pathname = usePathname();
  const { openAddExpense, userName } = useTrip();

  // The chat screen uses a full-height conversation layout and its own composer.
  if (!userName || pathname === '/chat') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 sm:px-4 pb-[calc(0.95rem+env(safe-area-inset-bottom,0px))] pointer-events-none select-none">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-1 rounded-full border border-[#F0E1D5] bg-[#FFF3E8]/95 px-2 py-1.5 shadow-[0_12px_32px_-4px_rgba(36,33,38,0.12)] backdrop-blur-xl"
      >
        {/* Home */}
        <Link
          href="/"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all group active:scale-95 ${
            pathname === '/' ? 'bg-white text-bvc-red font-semibold shadow-sm' : 'text-[#81766C] hover:bg-white/70 hover:text-bvc-red'
          }`}
          aria-label="Home Dashboard"
        >
          <Home
            className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110"
            strokeWidth={pathname === '/' ? 2.5 : 1.8}
          />
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* Transactions */}
        <Link
          href="/transactions"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all group active:scale-95 ${
            pathname === '/transactions' ? 'bg-white text-bvc-red font-semibold shadow-sm' : 'text-[#81766C] hover:bg-white/70 hover:text-bvc-red'
          }`}
          aria-label="Transactions"
        >
          <ReceiptText
            className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110"
            strokeWidth={pathname === '/transactions' ? 2.5 : 1.8}
          />
          <span className="max-w-[58px] truncate text-center text-[10px] tracking-tight">Expenses</span>
        </Link>

        {/* Central Raised Red Add Expense Button */}
        <div className="flex flex-col items-center justify-center px-1 -mt-6">
          <button
            type="button"
            onClick={() => openAddExpense()}
            aria-label="Add new expense"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-bvc-deepRed to-bvc-red text-white shadow-redGlow ring-4 ring-[#FFF3E8] transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="w-6 h-6" strokeWidth={2.6} />
          </button>
          <span className="mt-1 text-[9px] font-bold leading-none text-[#81766C]">Add</span>
        </div>

        {/* Analytics */}
        <Link
          href="/analytics"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all group active:scale-95 ${
            pathname === '/analytics' ? 'bg-white text-bvc-red font-semibold shadow-sm' : 'text-[#81766C] hover:bg-white/70 hover:text-bvc-red'
          }`}
          aria-label="Analytics"
        >
          <BarChart2
            className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110"
            strokeWidth={pathname === '/analytics' ? 2.5 : 1.8}
          />
          <span className="text-[10px] tracking-tight">Analytics</span>
        </Link>

        {/* Documents */}
        <Link
          href="/documents"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-all group active:scale-95 ${
            pathname === '/documents' ? 'bg-white text-bvc-red font-semibold shadow-sm' : 'text-[#81766C] hover:bg-white/70 hover:text-bvc-red'
          }`}
          aria-label="Documents"
        >
          <FolderArchive
            className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110"
            strokeWidth={pathname === '/documents' ? 2.5 : 1.8}
          />
          <span className="text-[10px] tracking-tight">Docs</span>
        </Link>
      </nav>
    </div>
  );
}
