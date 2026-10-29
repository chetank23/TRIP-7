'use client';

import React, { useState, useMemo } from 'react';
import { useTrip } from '@/lib/trip-context';
import { Header } from '@/components/Header';
import { ActivityAction, ActivityEvent } from '@/types';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Wallet,
  FileText,
  History,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

type FilterType = 'all' | 'expenses' | 'documents' | 'budget';

function getActionMeta(action: ActivityAction) {
  switch (action) {
    case 'expense_created':
      return {
        label: 'added an expense',
        icon: Plus,
        iconBg: '#FDF2F2',
        iconColor: '#E24A4A',
      };
    case 'expense_updated':
      return {
        label: 'edited an expense',
        icon: Pencil,
        iconBg: '#EDF5FD',
        iconColor: '#4A94E8',
      };
    case 'expense_deleted':
      return {
        label: 'deleted an expense',
        icon: Trash2,
        iconBg: '#FDF2F2',
        iconColor: '#D94444',
      };
    case 'document_uploaded':
      return {
        label: 'uploaded a document',
        icon: Upload,
        iconBg: '#F3F0FC',
        iconColor: '#8A74D4',
      };
    case 'document_updated':
      return {
        label: 'updated document details',
        icon: Pencil,
        iconBg: '#F3F0FC',
        iconColor: '#8A74D4',
      };
    case 'document_deleted':
      return {
        label: 'deleted a document',
        icon: Trash2,
        iconBg: '#FDF2F2',
        iconColor: '#D94444',
      };
    case 'budget_configured':
    case 'budget_updated':
      return {
        label: action === 'budget_configured' ? 'set the trip budget' : 'updated the trip budget',
        icon: Wallet,
        iconBg: '#FEF7EE',
        iconColor: '#EFA43A',
      };
    default:
      return {
        label: 'performed an operation',
        icon: History,
        iconBg: '#F4F3F5',
        iconColor: '#8E8994',
      };
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return `Today, ${timeStr}`;

    const dateOnly = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
    return `${dateOnly}, ${timeStr}`;
  } catch {
    return dateStr;
  }
}

export default function HistoryPage() {
  const { state } = useTrip();
  const [filter, setFilter] = useState<FilterType>('all');

  const activities = state?.activities || [];

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (filter === 'expenses') {
        return (
          act.action === 'expense_created' ||
          act.action === 'expense_updated' ||
          act.action === 'expense_deleted'
        );
      }
      if (filter === 'documents') {
        return (
          act.action === 'document_uploaded' ||
          act.action === 'document_updated' ||
          act.action === 'document_deleted'
        );
      }
      if (filter === 'budget') {
        return act.action === 'budget_configured' || act.action === 'budget_updated';
      }
      return true;
    });
  }, [activities, filter]);

  return (
    <div className="min-h-screen bg-bvc-bg pb-28">
      <Header
        title="Activity History"
        showBack
        rightAction={
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="text-xs font-semibold bg-white border border-cream-300 rounded-full px-3 py-1.5 text-bvc-text focus:outline-none focus:ring-1 focus:ring-bvc-red appearance-none pr-6 shadow-sm"
            >
              <option value="all">All Activities</option>
              <option value="expenses">Expenses</option>
              <option value="documents">Documents</option>
              <option value="budget">Budget</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-bvc-muted text-[10px]">
              ▼
            </div>
          </div>
        }
      />

      <main className="max-w-lg mx-auto px-4 pt-3 space-y-3">
        {/* Permanent Audit Guarantee Banner */}
        <div className="bg-white/90 rounded-2xl p-3 border border-cream-300 shadow-sm flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-bvc-text block leading-tight">Permanent Shared Audit Trail</span>
              <span className="text-[10px] text-bvc-secondary leading-tight block mt-0.5">
                Every modification is permanently saved in Vercel Blob and cannot be cleared.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 ml-2">
            Immutable
          </span>
        </div>
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-cream-300 text-center shadow-card flex flex-col items-center justify-center my-6">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-bvc-muted mb-3">
              <History className="w-6 h-6 stroke-[1.6]" />
            </div>
            <h3 className="text-sm font-bold text-bvc-text mb-1">No activities recorded yet</h3>
            <p className="text-xs text-bvc-secondary max-w-xs leading-relaxed">
              Every expense added, edited, or deleted, budget change, and document upload will be securely recorded here in an immutable audit trail.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 border border-cream-300 shadow-card divide-y divide-cream-200">
            {filteredActivities.map((act) => {
              const meta = getActionMeta(act.action);
              const Icon = meta.icon;

              return (
                <div key={act.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start space-x-3.5">
                  {/* Action Icon Badge */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: meta.iconBg, color: meta.iconColor }}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-bvc-text leading-tight">
                      <span className="text-bvc-deepRed">{act.actor}</span> {meta.label}
                    </p>

                    <div className="mt-1 flex items-center space-x-2 text-xs">
                      <span className="font-semibold text-bvc-text truncate">
                        {act.targetTitle}
                      </span>
                      {act.amount !== undefined && (
                        <span className="font-extrabold text-bvc-text tabular-nums shrink-0">
                          · ₹ {act.amount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {act.details?.description && (
                      <p className="text-[11px] text-bvc-secondary mt-0.5 leading-snug">
                        {act.details.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-1.5 text-[10px] text-bvc-muted mt-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(act.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

