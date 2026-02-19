export type TransactionInterval = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export type Transaction = {
  id: string;
  userId: string;
  originAccountId: string;
  targetAccountId: string;
  amount: number;
  notes: string;
  interval: TransactionInterval;
  type: TransactionType;
  category: string;
  occurredAt: Date;
  pending: boolean;
  createdAt: Date;
  updatedAt: Date;
  expires: Date;
};

export type TransactionDraft = {
  originAccountId: string;
  targetAccountId: string;
  amount: number;
  notes: string;
  interval?: TransactionInterval;
  type?: TransactionType;
  category: string;
  occurredAt?: Date;
  pending?: boolean;
  expires?: Date;
};

export type TransactionRecord = {
  id: string;
  userId: string;
  originAccountId: string;
  targetAccountId: string;
  amount: bigint;
  notes: string;
  interval: TransactionInterval;
  type: TransactionType;
  category: string;
  occurredAt: Date;
  pending: boolean;
  createdAt: Date;
  updatedAt: Date;
  expires: Date;
};

export type TransactionDelegate = {
  findMany: (args: {
    where: { userId: string; category?: string; originAccountId?: string; targetAccountId?: string };
    orderBy?: { createdAt: "asc" | "desc" };
    select?: {
      id?: true;
      userId?: true;
      originAccountId?: true;
      targetAccountId?: true;
      amount?: true;
      notes?: true;
      interval?: true;
      type?: true;
      category?: true;
      createdAt?: true;
      updatedAt?: true;
      expires?: true;
    };
  }) => Promise<TransactionRecord[]>;

  create: (args: {
    data: {
      userId: string;
      originAccountId: string;
      targetAccountId: string;
      amount: bigint;
      notes: string;
      interval?: TransactionInterval;
      type?: TransactionType;
      category: string;
      occurredAt?: Date;
      pending?: boolean;
      expires: Date;
    };
  }) => Promise<TransactionRecord>;

  findUnique: (args: {
    where: { id: string };
  }) => Promise<TransactionRecord | null>;

  update: (args: {
    where: { id: string };
    data: {
      originAccountId?: string;
      targetAccountId?: string;
      amount?: bigint;
      notes?: string;
      interval?: TransactionInterval;
      type?: TransactionType;
      category?: string;
      occurredAt?: Date;
      pending?: boolean;
      expires?: Date;
    };
  }) => Promise<TransactionRecord>;

  delete: (args: {
    where: { id: string };
  }) => Promise<TransactionRecord>;
};
