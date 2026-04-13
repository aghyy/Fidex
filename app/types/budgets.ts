/** Shape returned by GET /api/budget and /api/budget/[id]. Amounts in EUR. */
export type Budget = {
  id: string;
  name: string | null;
  targetAmount: number;
  categoryIds: string[];
  actualAmount: number;
  createdAt: string;
  updatedAt: string;
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

/** Prisma delegate shape for Budget model (used when generated client types are stale). */
export type BudgetDelegate = {
  findMany: (args: {
    where: { userId: string };
    include?: { categories: { select: { id: true } } };
    orderBy?: { updatedAt: "desc" };
  }) => Promise<
    Array<{
      id: string;
      name: string | null;
      targetAmount: number;
      createdAt: Date;
      updatedAt: Date;
      categories: { id: string }[];
    }>
  >;
  create: (args: {
    data: {
      userId: string;
      name?: string;
      targetAmount: number;
      categories: { connect: { id: string }[] };
    };
    include?: { categories: { select: { id: true } } };
  }) => Promise<{
    id: string;
    name: string | null;
    targetAmount: number;
    createdAt: Date;
    updatedAt: Date;
    categories: { id: string }[];
  }>;
  findFirst: (args: {
    where: { id: string; userId: string };
    include?: { categories: { select: { id: true } } };
  }) => Promise<{
    id: string;
    name: string | null;
    targetAmount: number;
    createdAt: Date;
    updatedAt: Date;
    categories: { id: string }[];
  } | null>;
  update: (args: {
    where: { id: string };
    data: {
      name?: string | null;
      targetAmount?: number;
      categories?: { set: { id: string }[] };
    };
    include?: { categories: { select: { id: true } } };
  }) => Promise<{
    id: string;
    name: string | null;
    targetAmount: number;
    createdAt: Date;
    updatedAt: Date;
    categories: { id: string }[];
  }>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};
