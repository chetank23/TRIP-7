'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ReceiptText, Plus, BarChart2, FolderArchive } from 'lucide-react';
import { useTrip } from '@/lib/trip-context';

export function Navigation() {
  const pathname = usePathname();
  const { openAddExpense, userName } = useTrip();

  // If user hasn't set their name yet, don't show navigation
  if (!userName) return null;

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Transactions', href: '/transactions', icon: ReceiptText },
    // Center is Add Expense
    { label: 'Analytics', href: '/analytics', icon: BarChart2 },
    { label: 'Documents', href: '/documents', icon: FolderArchive },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto w-full max-w-md glass-nav rounded-full px-3 py-2 flex items-center justify-between shadow-floating"
      >
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" strokeWidth={pathname === '/' ? 2.4 : 1.8} />
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* Transactions */}
        <Link
          href="/transactions"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/transactions' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
        >
          <ReceiptText className="w-5 h-5 mb-0.5" strokeWidth={pathname === '/transactions' ? 2.4 : 1.8} />
          <span className="text-[10px] tracking-tight">Transactions</span>
        </Link>

        {/* Central Raised Red Add Expense Button */}
        <div className="flex flex-col items-center justify-center px-1 -mt-5">
          <button
            type="button"
            onClick={() => openAddExpense()}
            aria-label="Add new expense"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-bvc-deepRed to-bvc-red text-white flex items-center justify-center shadow-redGlow hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" strokeWidth={2.6} />
          </button>
          <span className="text-[9px] font-medium text-bvc-secondary mt-1">Add</span>
        </div>

        {/* Analytics */}
        <Link
          href="/analytics"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/analytics' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
        >
          <BarChart2 className="w-5 h-5 mb-0.5" strokeWidth={pathname === '/analytics' ? 2.4 : 1.8} />
          <span className="text-[10px] tracking-tight">Analytics</span>
        </Link>

        {/* Documents */}
        <Link
          href="/documents"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/documents' ? 'text-bvc-red font-semibold' : 'text-bvc-secondary hover:text-bvc-text'
          }`}
        >
          <FolderArchive className="w-5 h-5 mb-0.5" strokeWidth={pathname === '/documents' ? 2.4 : 1.8} />
          <span className="text-[10px] tracking-tight">Documents</span>
        </Link>
      </nav>
    </div>
  );
}

