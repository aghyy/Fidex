export type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

export type CategoryDraft = {
  name: string;
  color: string | null;
  icon: string | null;
};

export type CategoryRecord = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  userId: string;
};

export type CategoryDelegate = {
  findMany: (args: {
    where: { userId: string };
    orderBy?: { name: "asc" | "desc" };
    select?: { id?: true; name?: true; color?: true; icon?: true };
  }) => Promise<CategoryRecord[]>;

  create: (args: {
    data: { userId: string; name: string; color?: string; icon?: string };
  }) => Promise<CategoryRecord>;

  findFirst: (args: {
    where: { id?: string; userId?: string };
  }) => Promise<CategoryRecord | null>;

  update: (args: {
    where: { id: string };
    data: Partial<Pick<CategoryRecord, "name" | "color" | "icon">>;
  }) => Promise<CategoryRecord>;

  delete: (args: { where: { id: string } }) => Promise<CategoryRecord>;
};
