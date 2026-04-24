import type { TransactionInterval, TransactionType } from "./transactions";

export type RecurringTransaction = {
  id: string;
  userId: string;
  originAccountId: string;
  targetAccountId: string;
  amount: number;
  notes: string;
  interval: Exclude<TransactionInterval, "ONCE">;
  type: TransactionType;
  category: string;
  startDate: Date;
  endDate: Date | null;
  nextOccurrenceAt: Date;
  lastOccurrenceAt: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RecurringTransactionSerialized = Omit<
  RecurringTransaction,
  "startDate" | "endDate" | "nextOccurrenceAt" | "lastOccurrenceAt" | "createdAt" | "updatedAt" | "amount"
> & {
  amount: string;
  startDate: string;
  endDate: string | null;
  nextOccurrenceAt: string;
  lastOccurrenceAt: string | null;
  createdAt: string;
  updatedAt: string;
};
