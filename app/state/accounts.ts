"use client";

import React from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { Account } from "@/types/accounts";

export const accountsAtom = atom<Account[]>([]);
export const accountsLoadedAtom = atom<boolean>(false);

export const loadAccountsAtom = atom(null, async (_get, set) => {
  try {
    const res = await fetch("/api/account", { credentials: "include" });
    const data = await res.json();
    set(accountsAtom, (data.accounts as Account[]) ?? []);
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


