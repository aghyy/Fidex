"use client";

import React from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";

type Account = { id: string; name: string; accountNumber: string; color: string | null; icon: string | null; balance: number };


export const accountsAtom = atom<Account[]>([]);
export const accountsLoadedAtom = atom<boolean>(false);

export const loadAccountsAtom = atom(null, async (_get, set) => {
  try {
    const res = await fetch("/api/account", { credentials: "include" });
    const data = await res.json();
    set(accountsAtom, (data.account as Account[]) ?? []);
  } catch {
    set(accountsAtom, []);
  } finally {
    set(accountsLoadedAtom, true);
  }
});

export function useAccountsBootstrap(enabled: boolean) {
  const load = useSetAtom(loadAccountsAtom);
  const loaded = useAtomValue(accountsLoadedAtom);

  React.useEffect(() => {
    if (!enabled) return;
    if (!loaded) {
      void load();
    }

    const onCreated = () => load();
    const onDeleted = () => load();
    try {
      window.addEventListener("account:created", onCreated as EventListener);
      window.addEventListener("account:deleted", onDeleted as EventListener);
    } catch {}
    return () => {
      try {
        window.removeEventListener("account:created", onCreated as EventListener);
        window.removeEventListener("account:deleted", onDeleted as EventListener);
      } catch {}
    };
  }, [enabled, loaded, load]);
}

export function useAccounts() {
  return useAtomValue(accountsAtom);
}


