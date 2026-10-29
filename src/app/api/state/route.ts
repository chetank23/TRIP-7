import { NextRequest, NextResponse } from 'next/server';
import { readState, updateState, getStorageStatus, deleteDocumentFile } from '@/lib/storage';
import { Expense, TripBudget, ActivityEvent, DocumentCategory } from '@/types';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

export async function GET() {
  try {
    const status = await getStorageStatus();
    if (!status.connected) {
      return NextResponse.json(
        {
          success: false,
          error: status.message,
          storage: status,
        },
        { status: status.code === 'CREDENTIALS_MISSING' ? 503 : 500, headers: NO_CACHE_HEADERS }
      );
    }

    const state = await readState();
    return NextResponse.json({
      success: true,
      data: state,
      storage: status,
      version: state.version,
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trip state';
    const status = await getStorageStatus().catch(() => null);
    return NextResponse.json(
      { success: false, error: message, storage: status },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload, expectedVersion, actor = 'Member' } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action type is required' }, { status: 400 });
    }

    const result = await updateState((current) => {
      const now = new Date().toISOString();
      const updated = { ...current };

      switch (action) {
        case 'UPDATE_BUDGET': {
          const { total } = payload as { total: number };
          const numTotal = Number(total);
          if (isNaN(numTotal) || numTotal < 0) {
            throw new Error('Valid budget amount is required');
          }

          const wasConfigured = current.budget.isConfigured;
          const oldBudget = current.budget.total;

          const newBudget: TripBudget = {
            total: numTotal,
            isConfigured: true,
            currency: 'INR',
            lastUpdatedBy: actor,
            lastUpdatedAt: now,
          };

          const event: ActivityEvent = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            action: wasConfigured ? 'budget_updated' : 'budget_configured',
            actor,
            targetId: 'budget',
            targetTitle: `Trip Budget ₹${numTotal.toLocaleString('en-IN')}`,
            amount: numTotal,
            timestamp: now,
            details: {
              oldValue: wasConfigured ? `₹${oldBudget.toLocaleString('en-IN')}` : 'Not set',
              newValue: `₹${numTotal.toLocaleString('en-IN')}`,
              description: wasConfigured ? `Changed budget to ₹${numTotal.toLocaleString('en-IN')}` : `Configured initial budget to ₹${numTotal.toLocaleString('en-IN')}`,
            },
          };

          updated.budget = newBudget;
          updated.activities = [event, ...updated.activities];
          break;
        }

        case 'ADD_EXPENSE': {
          const exp = payload as Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;
          const numAmount = Number(exp.amount);
          if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error('Expense amount must be a positive number');
          }
          if (!exp.purpose?.trim()) {
            throw new Error('Expense purpose/description is required');
          }
          if (!exp.paidBy?.trim()) {
            throw new Error('Paid by is required');
          }

          const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newExpense: Expense = {
            ...exp,
            id,
            amount: numAmount,
            purpose: exp.purpose.trim(),
            category: exp.category || 'Others',
            paidBy: exp.paidBy.trim(),
            recordedBy: actor,
            date: exp.date || now,
            createdAt: now,
            updatedAt: now,
          };

          const event: ActivityEvent = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            action: 'expense_created',
            actor,
            targetId: id,
            targetTitle: newExpense.purpose,
            category: newExpense.category,
            amount: newExpense.amount,
            timestamp: now,
            details: {
              description: `Added ${newExpense.purpose} (₹${numAmount.toLocaleString('en-IN')}) paid by ${newExpense.paidBy}`,
            },
          };

          // Also ensure payer is in members list if not already
          if (!updated.members.includes(newExpense.paidBy)) {
            updated.members = [...updated.members, newExpense.paidBy];
          }

          updated.expenses = [newExpense, ...updated.expenses];
          updated.activities = [event, ...updated.activities];
          break;
        }

        case 'UPDATE_EXPENSE': {
          const { id, ...updates } = payload as Partial<Expense> & { id: string };
          const index = updated.expenses.findIndex((e) => e.id === id);
          if (index === -1) {
            throw new Error('Expense record not found');
          }

          const existing = updated.expenses[index];
          const newAmount = updates.amount !== undefined ? Number(updates.amount) : existing.amount;
          if (isNaN(newAmount) || newAmount <= 0) {
            throw new Error('Expense amount must be a positive number');
          }

          const updatedExpense: Expense = {
            ...existing,
            ...updates,
            id: existing.id,
            amount: newAmount,
            purpose: updates.purpose ? updates.purpose.trim() : existing.purpose,
            paidBy: updates.paidBy ? updates.paidBy.trim() : existing.paidBy,
            recordedBy: actor,
            updatedAt: now,
          };

          const event: ActivityEvent = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            action: 'expense_updated',
            actor,
            targetId: id,
            targetTitle: updatedExpense.purpose,
            category: updatedExpense.category,
            amount: updatedExpense.amount,
            timestamp: now,
            details: {
              oldValue: `₹${existing.amount.toLocaleString('en-IN')}`,
              newValue: `₹${updatedExpense.amount.toLocaleString('en-IN')}`,
              description: `Edited ${updatedExpense.purpose} (₹${updatedExpense.amount.toLocaleString('en-IN')})`,
            },
          };

          updated.expenses[index] = updatedExpense;
          updated.activities = [event, ...updated.activities];
          break;
        }

        case 'DELETE_EXPENSE': {
          const { id } = payload as { id: string };
          const existing = updated.expenses.find((e) => e.id === id);
          if (!existing) {
            throw new Error('Expense record not found');
          }

          const event: ActivityEvent = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            action: 'expense_deleted',
            actor,
            targetId: id,
            targetTitle: existing.purpose,
            category: existing.category,
            amount: existing.amount,
            timestamp: now,
            details: {
              oldValue: `₹${existing.amount.toLocaleString('en-IN')}`,
              description: `Deleted ${existing.purpose} (₹${existing.amount.toLocaleString('en-IN')}) originally paid by ${existing.paidBy}`,
            },
          };

          updated.expenses = updated.expenses.filter((e) => e.id !== id);
          updated.activities = [event, ...updated.activities];
          break;
        }

        case 'UPDATE_DOCUMENT': {
          const { id, title, category } = payload as {
            id: string;
            title?: string;
            category?: DocumentCategory;
          };
          const index = updated.documents.findIndex((d) => d.id === id);
          if (index === -1) {
            throw new Error('Document not found');
          }

          const existing = updated.documents[index];
          const updatedDoc = {
            ...existing,
            title: title ? title.trim() : existing.title,
            category: category || existing.category,
            updatedAt: now,
          };

          const event: ActivityEvent = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            action: 'document_updated',
            actor,
            targetId: id,
            targetTitle: updatedDoc.title,
            timestamp: now,
            details: {
              description: `Updated document metadata for "${updatedDoc.title}"`,
            },
          };

          updated.documents[index] = updatedDoc;
          updated.activities = [event, ...updated.activities];
          break;
        }

        case 'DELETE_DOCUMENT': {
          const { id } = payload as { id: string };
          const doc = updated.documents.find((d) => d.id === id);
          if (!doc) {
            throw new Error('Document not found');
          }

          // Asynchronously trigger blob deletion in background
          deleteDocumentFile(doc.fileUrl).catch((err) => {
            console.error('Failed to delete document file:', err);
          });

          const event: ActivityEvent = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            action: 'document_deleted',
            actor,
            targetId: id,
            targetTitle: doc.title,
            timestamp: now,
            details: {
              description: `Deleted document "${doc.title}"`,
            },
          };

          updated.documents = updated.documents.filter((d) => d.id !== id);
          updated.activities = [event, ...updated.activities];
          break;
        }

        case 'UPDATE_MEMBERS': {
          const { members } = payload as { members: string[] };
          if (Array.isArray(members) && members.length > 0) {
            updated.members = Array.from(new Set(members.map((m) => m.trim()).filter(Boolean)));
          }
          break;
        }

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      return updated;
    }, expectedVersion);

    if (result.conflict) {
      return NextResponse.json(
        {
          success: false,
          conflict: true,
          error: 'State was updated by another member. Please refresh to load the latest data.',
          data: result.state,
          version: result.state.version,
        },
        { status: 409, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.state,
      version: result.state.version,
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error processing mutation';
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

