"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TransactionsManager from "@/components/transactions/TransactionsManager";
import TransactionFAB from "@/components/transactions/TransactionFAB";
import { Account } from "@/types/accounts";

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [account, setAccount] = useState<Account | null>(null);
  const [resolvedAccountId, setResolvedAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/account/${id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAccount(data.account ?? null);
          setResolvedAccountId(data.account?.id ?? id);
          return;
        }

        // Backward compatibility: old links used account name slugs.
        const listRes = await fetch("/api/account", { credentials: "include" });
        if (!listRes.ok) throw new Error("Failed to fetch account");
        const listData = await listRes.json();
        const decoded = decodeURIComponent(id).toLowerCase();
        const fallback = (listData.accounts ?? []).find(
          (a: Account) => a.name.toLowerCase() === decoded
        ) as Account | undefined;
        setAccount(fallback ?? null);
        setResolvedAccountId(fallback?.id ?? id);
      } catch {
        setAccount(null);
        setResolvedAccountId(id);
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, [id]);

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/"
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">Account</h1>
        </div>

        <div className="mb-6 rounded-xl border bg-background p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading account...</p>
          ) : account ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{account.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <p className="font-medium">{account.accountNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-medium">EUR {account.balance}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">EUR (currently only supported)</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Account not found.</p>
          )}
        </div>

        <h2 className="mb-3 text-lg font-semibold">Transactions</h2>
        <TransactionsManager accountFilter={resolvedAccountId || id} />
      </div>
      <TransactionFAB preselectedAccount={resolvedAccountId || id} />
    </>
  );
}


