export type ExpenseCategory =
  | 'Food'
  | 'Stay'
  | 'Transport'
  | 'Activities'
  | 'Shopping'
  | 'Others';

export type DocumentCategory =
  | 'Stay'
  | 'Tickets'
  | 'Transport'
  | 'Activities'
  | 'Others';

export type ActivityAction =
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'budget_configured'
  | 'budget_updated'
  | 'document_uploaded'
  | 'document_updated'
  | 'document_deleted';

export interface Expense {
  id: string;
  amount: number; // In Rupees (e.g. 450)
  purpose: string;
  category: ExpenseCategory;
  paidBy: string; // Member display name who paid
  recordedBy: string; // Member who logged the entry
  date: string; // ISO 8601 string
  splitWith?: string; // e.g. "All (7 members)" or custom
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: number; // In bytes
  fileUrl: string; // Blob storage URL or local proxy URL
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  action: ActivityAction;
  actor: string;
  targetId: string;
  targetTitle: string;
  category?: string;
  amount?: number;
  timestamp: string;
  details?: {
    oldValue?: string | number | null;
    newValue?: string | number | null;
    field?: string;
    description?: string;
  };
}

export interface TripBudget {
  total: number; // Configured total budget, 0 or positive
  isConfigured: boolean;
  currency: string; // Default 'INR' / '₹'
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface TripState {
  version: number; // Incrementing counter for optimistic concurrency control
  budget: TripBudget;
  expenses: Expense[];
  documents: TripDocument[];
  activities: ActivityEvent[];
  members: string[]; // List of active trip members (e.g. 7 friends)
  lastSyncedAt: string;
}

export type StorageStatusCode =
  | 'CONNECTED'
  | 'CREDENTIALS_MISSING'
  | 'AUTH_FAILED'
  | 'STATE_NOT_INITIALIZED'
  | 'READ_FAILED'
  | 'WRITE_FAILED';

export type StorageStatusText =
  | 'Connected to Vercel Blob'
  | 'Blob credentials missing'
  | 'Blob authentication failed'
  | 'Shared state not initialized'
  | 'Blob read failed'
  | 'Blob write failed';

export interface StorageStatus {
  connected: boolean;
  status: StorageStatusText;
  code: StorageStatusCode;
  message: string;
  provider: 'vercel-blob';
  stateExists?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  version?: number;
}

