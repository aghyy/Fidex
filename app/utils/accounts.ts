import { Account, AccountDraft } from "@/types/accounts";

export function toDraft(account: Account): AccountDraft {
  return {
    name: account.name,
    color: account.color ?? null,
    icon: account.icon ?? null,
  };
}