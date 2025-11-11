export type Account = {
  id: string;
  name: string;
  accountNumber: string;
  color: string | null;
  icon: string | null;
  balance: number;
};

export type AccountRecord = {
  id: string;
  name: string;
  accountNumber: string;
  color: string | null;
  icon: string | null;
  balance: number;
};

export type AccountDelegate = {
  findMany: (args: {
    where: { userId: string };
    orderBy?: { name: "asc" | "desc" };
    select?: {
      id?: true;
      name?: true;
      accountNumber?: true;
      color?: true;
      icon?: true;
      balance?: true;
    };
  }) => Promise<AccountRecord[]>;

  create: (args: {
    data: {
      userId: string;
      name: string;
      accountNumber: string;
      color?: string;
      icon?: string;
      balance?: number;
    };
  }) => Promise<AccountRecord>;

  findUnique: (args: {
    where: { id: string; userId: string };
  }) => Promise<AccountRecord | null>;

  update: (args: {
    where: { id: string; userId: string };
    data: {
      name?: string;
      accountNumber?: string;
      color?: string;
      icon?: string;
      balance?: number;
    };
  }) => Promise<AccountRecord>;

  delete: (args: {
    where: { id: string; userId: string };
  }) => Promise<AccountRecord>;
};
