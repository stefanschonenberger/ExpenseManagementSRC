// frontend/src/types/index.ts

// This is the canonical definition for an Expense object.
// All components should import this type to ensure consistency.
export interface Expense {
  id: string;
  title: string;
  amount: number;
  vat_amount: number;
  expense_date: string;
  status: string;
  currency_code: string;
  receipt_blob_id: string | null;
  supplier: string | null;
  vat_applied: boolean;
  expense_type: string;
  book: boolean;
  book_amount: number;
  description?: string; // Optional property
  created_at: string;
}

// A minimal version for creating reports, if needed elsewhere
export interface DraftExpense {
    id: string;
    title: string;
    amount: number;
    supplier: string | null;
    expense_date: string;
}

// A minimal version for the report object itself
export interface Report {
  id: string;
  title: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejection_reason: string | null;
}
