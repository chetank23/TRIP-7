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
        className="pointer-events-auto w-full max-w-md glass-nav rounded-full px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-floating border border-white/80"
      >
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-1 flex-col items-center justify-center px-0.5 py-1 transition-colors group active:scale-95 ${
            pathname === '/' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
          aria-label="Home Dashboard"
        >
          <Home
            className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform"
            strokeWidth={pathname === '/' ? 2.5 : 1.8}
          />
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* Transactions */}
        <Link
          href="/transactions"
          className={`flex flex-1 flex-col items-center justify-center px-0.5 py-1 transition-colors group active:scale-95 ${
            pathname === '/transactions' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
          aria-label="Transactions"
        >
          <ReceiptText
            className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform"
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
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-bvc-deepRed to-bvc-red text-white flex items-center justify-center shadow-redGlow hover:scale-105 active:scale-95 transition-transform ring-4 ring-[#FEFBF6]"
          >
            <Plus className="w-6 h-6" strokeWidth={2.6} />
          </button>
          <span className="text-[9px] font-bold text-bvc-secondary mt-1">Add</span>
        </div>

        {/* Analytics */}
        <Link
          href="/analytics"
          className={`flex flex-1 flex-col items-center justify-center px-0.5 py-1 transition-colors group active:scale-95 ${
            pathname === '/analytics' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
          aria-label="Analytics"
        >
          <BarChart2
            className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform"
            strokeWidth={pathname === '/analytics' ? 2.5 : 1.8}
          />
          <span className="text-[10px] tracking-tight">Analytics</span>
        </Link>

        {/* Documents */}
        <Link
          href="/documents"
          className={`flex flex-1 flex-col items-center justify-center px-0.5 py-1 transition-colors group active:scale-95 ${
            pathname === '/documents' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
          aria-label="Documents"
        >
          <FolderArchive
            className="w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform"
            strokeWidth={pathname === '/documents' ? 2.5 : 1.8}
          />
          <span className="text-[10px] tracking-tight">Docs</span>
        </Link>
      </nav>
    </div>
  );
}
