import { Category, CategoryDraft } from "@/types/categories";

export function toDraft(category: Category): CategoryDraft {
  return {
    name: category.name,
    color: category.color ?? null,
    icon: category.icon ?? null,
  };
}