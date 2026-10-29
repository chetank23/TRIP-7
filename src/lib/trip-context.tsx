'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  TripState,
  Expense,
  TripDocument,
  ActivityEvent,
  StorageStatus,
  DocumentCategory,
  ExpenseCategory,
} from '@/types';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface TripContextType {
  userName: string;
  isUserLoaded: boolean;
  setUserName: (name: string) => void;
  logout: () => void;
  state: TripState | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  storageStatus: StorageStatus | null;
  refreshState: () => Promise<void>;
  
  // Computed financial totals
  totalSpent: number;
  remainingBudget: number;
  spentPercentage: number;
  categorySpending: Record<ExpenseCategory, number>;
  
  // Modals & Sheets
  isAddExpenseOpen: boolean;
  editingExpense: Expense | null;
  openAddExpense: (expenseToEdit?: Expense) => void;
  closeAddExpense: () => void;
  
  deleteExpenseTarget: Expense | null;
  promptDeleteExpense: (expense: Expense) => void;
  closeDeleteConfirm: () => void;
  confirmDeleteExpense: () => Promise<boolean>;
  
  isBudgetModalOpen: boolean;
  openBudgetModal: () => void;
  closeBudgetModal: () => void;
  
  activePdfDoc: TripDocument | null;
  openPdfViewer: (doc: TripDocument) => void;
  closePdfViewer: () => void;
  
  // CRUD Actions
  saveExpense: (data: {
    amount: number;
    purpose: string;
    category: ExpenseCategory;
    paidBy: string;
    date: string;
    splitWith?: string;
    notes?: string;
  }) => Promise<boolean>;
  
  updateBudget: (total: number) => Promise<boolean>;
  uploadDocument: (file: File, title: string, category: DocumentCategory) => Promise<boolean>;
  updateDocumentMetadata: (id: string, title: string, category: DocumentCategory) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  
  // Toast notifications
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'bvc_user_name';

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserNameState] = useState<string>('');
  const [isUserLoaded, setIsUserLoaded] = useState<boolean>(false);
  const [state, setState] = useState<TripState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);

  // Sheets and Dialogs state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [activePdfDoc, setActivePdfDoc] = useState<TripDocument | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3800);
  }, []);

  // Initialize user from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved && saved.trim()) {
        setUserNameState(saved.trim());
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    } finally {
      setIsUserLoaded(true);
    }
  }, []);

  const setUserName = useCallback((name: string) => {
    const trimmed = name.trim();
    setUserNameState(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(USER_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }, []);

  const logout = useCallback(() => {
    setUserNameState('');
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {}
  }, []);

  // Fetch shared state from server
  const fetchState = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsSyncing(true);

    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const data = await res.json().catch(() => null);

      if (data?.storage) {
        setStorageStatus(data.storage);
      }

      if (!res.ok || !data?.success) {
        const errorMsg = data?.error || `Storage error (HTTP ${res.status})`;
        setError(errorMsg);
        if (!isBackground) {
          console.warn('Trip storage sync notice:', errorMsg);
        }
        return;
      }

      if (data.data) {
        setState(data.data);
        setError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error syncing state with Vercel Blob';
      if (!isBackground) setError(msg);
      console.error('Sync error:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Periodic background synchronization every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchState(true);
    }, 7000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Financial calculations derived authoritatively from actual state
  const totalSpent = useMemo(() => {
    if (!state || !state.expenses) return 0;
    return state.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [state]);

  const remainingBudget = useMemo(() => {
    if (!state?.budget?.isConfigured) return 0;
    return (state.budget.total || 0) - totalSpent;
  }, [state, totalSpent]);

  const spentPercentage = useMemo(() => {
    if (!state?.budget?.isConfigured || state.budget.total <= 0) return 0;
    const pct = Math.round((totalSpent / state.budget.total) * 100);
    return isNaN(pct) ? 0 : Math.min(pct, 999);
  }, [state, totalSpent]);

  const categorySpending = useMemo<Record<ExpenseCategory, number>>(() => {
    const totals: Record<ExpenseCategory, number> = {
      Food: 0,
      Stay: 0,
      Transport: 0,
      Activities: 0,
      Shopping: 0,
      Others: 0,
    };
    if (!state?.expenses) return totals;
    for (const exp of state.expenses) {
      if (totals[exp.category] !== undefined) {
        totals[exp.category] += Number(exp.amount) || 0;
      } else {
        totals.Others += Number(exp.amount) || 0;
      }
    }
    return totals;
  }, [state]);

  // Modals controls
  const openAddExpense = useCallback((expenseToEdit?: Expense) => {
    if (expenseToEdit) {
      setEditingExpense(expenseToEdit);
    } else {
      setEditingExpense(null);
    }
    setIsAddExpenseOpen(true);
  }, []);

  const closeAddExpense = useCallback(() => {
    setIsAddExpenseOpen(false);
    setEditingExpense(null);
  }, []);

  const promptDeleteExpense = useCallback((expense: Expense) => {
    setDeleteExpenseTarget(expense);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteExpenseTarget(null);
  }, []);

  const openBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(true);
  }, []);

  const closeBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(false);
  }, []);

  const openPdfViewer = useCallback((doc: TripDocument) => {
    setActivePdfDoc(doc);
  }, []);

  const closePdfViewer = useCallback(() => {
    setActivePdfDoc(null);
  }, []);

  // CRUD Mutations
  const saveExpense = useCallback(
    async (data: {
      amount: number;
      purpose: string;
      category: ExpenseCategory;
      paidBy: string;
      date: string;
      splitWith?: string;
      notes?: string;
    }): Promise<boolean> => {
      if (!state) return false;
      const isEditing = Boolean(editingExpense);
      const action = isEditing ? 'UPDATE_EXPENSE' : 'ADD_EXPENSE';
      const payload = isEditing ? { id: editingExpense!.id, ...data } : data;

      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            payload,
            expectedVersion: state.version,
            actor: userName || data.paidBy || 'Member',
          }),
        });

        const json = await res.json();
        if (res.status === 409) {
          showToast('Data was modified by another member. Latest changes reloaded.', 'error');
          if (json.data) setState(json.data);
          return false;
        }

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to save expense');
        }

        setState(json.data);
        closeAddExpense();
        showToast(
          isEditing ? 'Expense updated successfully!' : 'Expense added to shared trip!',
          'success'
        );
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error saving expense';
        showToast(msg, 'error');
        return false;
      }
    },
    [state, editingExpense, userName, closeAddExpense, showToast]
  );

  const confirmDeleteExpense = useCallback(async (): Promise<boolean> => {
    if (!state || !deleteExpenseTarget) return false;

    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_EXPENSE',
          payload: { id: deleteExpenseTarget.id },
          expectedVersion: state.version,
          actor: userName || 'Member',
        }),
      });

      const json = await res.json();
      if (res.status === 409) {
        showToast('Data was updated by another member. Latest changes loaded.', 'error');
        if (json.data) setState(json.data);
        closeDeleteConfirm();
        return false;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete expense');
      }

      setState(json.data);
      closeDeleteConfirm();
      showToast('Expense removed and recorded in history.', 'info');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting expense';
      showToast(msg, 'error');
      return false;
    }
  }, [state, deleteExpenseTarget, userName, closeDeleteConfirm, showToast]);

  const updateBudget = useCallback(
    async (total: number): Promise<boolean> => {
      if (!state) return false;

      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_BUDGET',
            payload: { total },
            expectedVersion: state.version,
            actor: userName || 'Member',
          }),
        });

        const json = await res.json();
        if (res.status === 409) {
          showToast('Data was updated by another member. Please retry.', 'error');
          if (json.data) setState(json.data);
          return false;
        }

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update budget');
        }

        setState(json.data);
        closeBudgetModal();
        showToast(`Trip budget set to ₹${total.toLocaleString('en-IN')}`, 'success');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error updating budget';
        showToast(msg, 'error');
        return false;
      }
    },
    [state, userName, closeBudgetModal, showToast]
  );

  const uploadDocument = useCallback(
    async (file: File, title: string, category: DocumentCategory): Promise<boolean> => {
      if (!state) return false;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('category', category);
        formData.append('uploadedBy', userName || 'Member');
        if (state.version !== undefined) {
          formData.append('expectedVersion', String(state.version));
        }

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (res.status === 409) {
          showToast('State was modified during upload. Document saved, reloaded state.', 'info');
          if (json.data) setState(json.data);
          return false;
        }

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to upload document');
        }

        if (json.state) setState(json.state);
        showToast(`Document "${title}" uploaded successfully!`, 'success');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error uploading document';
        showToast(msg, 'error');
        return false;
      }
    },
    [state, userName, showToast]
  );

  const updateDocumentMetadata = useCallback(
    async (id: string, title: string, category: DocumentCategory): Promise<boolean> => {
      if (!state) return false;

      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_DOCUMENT',
            payload: { id, title, category },
            expectedVersion: state.version,
            actor: userName || 'Member',
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update document metadata');
        }

        setState(json.data);
        showToast('Document details updated', 'success');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error updating document';
        showToast(msg, 'error');
        return false;
      }
    },
    [state, userName, showToast]
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      if (!state) return false;

      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'DELETE_DOCUMENT',
            payload: { id },
            expectedVersion: state.version,
            actor: userName || 'Member',
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to delete document');
        }

        setState(json.data);
        showToast('Document removed from trip library', 'info');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error deleting document';
        showToast(msg, 'error');
        return false;
      }
    },
    [state, userName, showToast]
  );

  const value = {
    userName,
    isUserLoaded,
    setUserName,
    logout,
    state,
    isLoading,
    isSyncing,
    error,
    storageStatus,
    refreshState: () => fetchState(false),
    totalSpent,
    remainingBudget,
    spentPercentage,
    categorySpending,
    isAddExpenseOpen,
    editingExpense,
    openAddExpense,
    closeAddExpense,
    deleteExpenseTarget,
    promptDeleteExpense,
    closeDeleteConfirm,
    confirmDeleteExpense,
    isBudgetModalOpen,
    openBudgetModal,
    closeBudgetModal,
    activePdfDoc,
    openPdfViewer,
    closePdfViewer,
    saveExpense,
    updateBudget,
    uploadDocument,
    updateDocumentMetadata,
    deleteDocument,
    toast,
    showToast,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}

