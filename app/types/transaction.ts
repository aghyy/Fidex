export type TransactionInterval = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export type TransactionRecord = {
    id: string;
    categoryId?: string;
    originAccountId: string;
    targetAccountId: string;
    amount: number;
    notes: string;
    interval: TransactionInterval;
    type: TransactionType;
  };
export type TransactionDelegate = {
  findMany: (args: {
    where: { userId: string };
    orderBy?: { name: "asc" | "desc" };
    select?: { id?: true; userId?: true; categoryId?: true };
  }) => Promise<TransactionRecord[]>;
  create: (args: {
    data: {
      userId: string;
      categoryId?: string;
      originAccountId: string;
      targetAccountId: string;
      amount: number;
      notes?: string;
      interval: TransactionInterval;
      type: TransactionType;
    };
  }) => Promise<TransactionRecord>;

  findFirst: (args: {
    where: { id?: string; userId?: string };
  }) => Promise<TransactionRecord | null>;

  update: (args: {
    where: { id: string };
    data: {
      categoryId?: string;
      originAccountId: string;
      targetAccountId: string;
      amount: number;
      notes: string;
      interval: TransactionInterval;
      type: TransactionType;
    }
  }) => Promise<TransactionRecord>;

  delete: (args: { where: { id: string } }) => Promise<TransactionRecord>;
};