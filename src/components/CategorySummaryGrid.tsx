'use client';

import React from 'react';
import Link from 'next/link';
import { useTrip } from '@/lib/trip-context';
import { ExpenseCategory } from '@/types';
import {
  Utensils,
  Bed,
  Car,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react';

interface CategoryItem {
  key: ExpenseCategory;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const CATEGORIES: CategoryItem[] = [
  { key: 'Food', label: 'Food', icon: Utensils, iconColor: '#E24A4A', iconBg: '#FDF2F2' },
  { key: 'Stay', label: 'Stay', icon: Bed, iconColor: '#8A74D4', iconBg: '#F3F0FC' },
  { key: 'Transport', label: 'Transport', icon: Car, iconColor: '#4A94E8', iconBg: '#EDF5FD' },
  { key: 'Activities', label: 'Activities', icon: Ticket, iconColor: '#E65C8C', iconBg: '#FDF0F5' },
  { key: 'Shopping', label: 'Shopping', icon: ShoppingBag, iconColor: '#EFA43A', iconBg: '#FEF7EE' },
  { key: 'Others', label: 'Others', icon: MoreHorizontal, iconColor: '#8E8994', iconBg: '#F4F3F5' },
];

export function CategorySummaryGrid() {
  const { categorySpending } = useTrip();

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const amount = categorySpending[cat.key] || 0;

          return (
            <Link
              key={cat.key}
              href={`/transactions?category=${encodeURIComponent(cat.key)}`}
              className="bg-white rounded-2xl p-3 border border-cream-300 shadow-sm hover:shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all flex flex-col items-center text-center group"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105"
                style={{ backgroundColor: cat.iconBg, color: cat.iconColor }}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-bvc-text truncate tabular-nums">
                ₹ {amount.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-bvc-secondary font-medium mt-0.5">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
