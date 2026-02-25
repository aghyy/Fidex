/** Shape returned by GET /api/budget and /api/budget/[id] */
export type Budget = {
  id: string;
  name: string | null;
  targetAmount: number;
  categoryIds: string[];
  actualAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BudgetCreate = {
  name?: string | null;
  targetAmount: number;
  categoryIds: string[];
};

export type BudgetUpdate = {
  name?: string | null;
  targetAmount?: number;
  categoryIds?: string[];
};
