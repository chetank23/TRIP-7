'use client';

import React, { useState } from 'react';
import { useTrip } from '@/lib/trip-context';
import { Trash2, Loader2, Utensils, Bed, Car, Ticket, ShoppingBag, MoreHorizontal } from 'lucide-react';
import { ExpenseCategory } from '@/types';

const CATEGORY_ICONS: Record<ExpenseCategory, React.ElementType> = {
  Food: Utensils,
  Stay: Bed,
  Transport: Car,
  Activities: Ticket,
  Shopping: ShoppingBag,
  Others: MoreHorizontal,
};

export function DeleteConfirmModal() {
  const { deleteExpenseTarget, closeDeleteConfirm, confirmDeleteExpense } = useTrip();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!deleteExpenseTarget) return null;

  const Icon = CATEGORY_ICONS[deleteExpenseTarget.category] || MoreHorizontal;

  const handleDelete = async () => {
    setIsDeleting(true);
    await confirmDeleteExpense();
    setIsDeleting(false);
  };

  const formattedDate = (() => {
    try {
      const d = new Date(deleteExpenseTarget.date);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return deleteExpenseTarget.date;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Soft blurred background */}
      <div
        className="fixed inset-0 bg-bvc-text/40 backdrop-blur-sm transition-opacity"
        onClick={closeDeleteConfirm}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-floating border border-cream-300 z-10 text-center animate-in zoom-in-95 duration-200">
        {/* Red trash icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-bvc-error flex items-center justify-center mx-auto mb-3.5">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-bvc-text mb-1">Delete Expense?</h3>
        <p className="text-xs text-bvc-secondary leading-relaxed mb-5">
          Are you sure you want to delete this expense? This will be recorded in history.
        </p>

        {/* Item preview card */}
        <div className="bg-white rounded-2xl p-3.5 border border-cream-300 flex items-center justify-between text-left mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-bvc-redLight text-bvc-red flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-bvc-text leading-tight">{deleteExpenseTarget.purpose}</p>
              <p className="text-[11px] text-bvc-secondary mt-0.5">
                {formattedDate} · by {deleteExpenseTarget.paidBy}
              </p>
            </div>
          </div>
          <div className="text-right pl-2">
            <span className="text-sm font-extrabold text-bvc-text tabular-nums">
              ₹ {deleteExpenseTarget.amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-bvc-deepRed to-bvc-red hover:from-bvc-red hover:to-bvc-redHighlight text-white text-sm font-bold shadow-redGlow active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete</span>
            )}
          </button>
          <button
            type="button"
            onClick={closeDeleteConfirm}
            disabled={isDeleting}
            className="w-full py-3 rounded-2xl bg-cream-200 hover:bg-cream-300 text-bvc-secondary text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
