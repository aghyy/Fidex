"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentItem, DocumentKind } from "@/types/documents";

type LinkedTransaction = {
  id: string;
  notes: string;
  amount: string;
  createdAt: string;
};

type DocumentResponse = DocumentItem & {
  transactionIds: string[];
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export default function DocumentDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const documentId = params?.id ?? "";

  const [document, setDocument] = useState<DocumentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<DocumentKind>("OTHER");
  const [allTransactions, setAllTransactions] = useState<LinkedTransaction[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signup");
  }, [status, router]);

  useEffect(() => {
    async function loadDocument() {
      if (!documentId || status !== "authenticated") return;
      setLoading(true);
      setError(null);
      try {
        const [docRes, txRes] = await Promise.all([
          fetch(`/api/document/${documentId}`, { credentials: "include" }),
          fetch("/api/transaction", { credentials: "include" }),
        ]);
        const docData = await docRes.json();
        if (!docRes.ok) throw new Error(docData.error ?? "Failed to fetch document");
        const txData = txRes.ok ? await txRes.json() : { transactions: [] };

        const item = docData.document as DocumentResponse;
        setDocument(item);
        setTitle(item.title);
        setNotes(item.notes ?? "");
        setKind(item.kind);
        setSelectedTransactionIds(item.transactionIds ?? []);
        setAllTransactions((txData.transactions ?? []) as LinkedTransaction[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to fetch document");
      } finally {
        setLoading(false);
      }
    }
    void loadDocument();
  }, [documentId, status]);

  const isImage = useMemo(() => document?.mimeType?.startsWith("image/"), [document?.mimeType]);
  const isPdf = useMemo(() => document?.mimeType === "application/pdf", [document?.mimeType]);

  async function handleSave() {
    if (!document) return;
    setSaving(true);
    setError(null);
    try {
      const [docRes, linkRes] = await Promise.all([
        fetch(`/api/document/${document.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: title.trim(),
            notes: notes.trim() || null,
            kind,
          }),
        }),
        fetch(`/api/document/${document.id}/transactions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ transactionIds: selectedTransactionIds }),
        }),
      ]);

      const docData = await docRes.json();
      if (!docRes.ok) throw new Error(docData.error ?? "Failed to save document");

      const linkData = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkData.error ?? "Failed to save document links");

      setDocument((prev) =>
        prev
          ? {
              ...prev,
              ...docData.document,
              transactionIds: selectedTransactionIds,
            }
          : prev
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save document");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!document) return;
    if (!confirm("Delete this document?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/document/${document.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete document");
      router.push("/documents");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete document");
      setSaving(false);
    }
  }

  if (status === "loading" || status === "unauthenticated" || loading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border bg-background p-6 text-sm text-red-500">{error ?? "Document not found."}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/documents" className="rounded-md border px-2 py-1 text-sm hover:bg-accent">
            Back
          </Link>
          <h1 className="truncate text-2xl font-bold">{document.title}</h1>
        </div>
        <a href={document.url} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
          Open original
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border bg-background p-4">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={document.url} alt={document.title} className="max-h-[70vh] w-full rounded-md object-contain" />
          ) : isPdf ? (
            <iframe src={document.url} className="h-[70vh] w-full rounded-md border" title={document.title} />
          ) : (
            <div className="flex h-[50vh] flex-col items-center justify-center rounded-md border bg-muted/30 text-center">
              <p className="text-sm font-medium">Preview not available for this file type.</p>
              <p className="mt-1 text-xs text-muted-foreground">Use Open original to download/view it.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-background p-4">
          <div className="grid gap-3">
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="doc-title">
                Title
              </label>
              <input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground" htmlFor="doc-kind">
                Kind
              </label>
              <select
                id="doc-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as DocumentKind)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="OTHER">Other</option>
                <option value="CONTRACT">Contract</option>
                <option value="BILL">Bill</option>
                <option value="RECEIPT">Receipt</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground" htmlFor="doc-notes">
                Notes
              </label>
              <textarea
                id="doc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>{document.originalFileName}</p>
              <p>{document.mimeType}</p>
              <p>{formatBytes(document.sizeBytes)}</p>
              <p>Uploaded {new Date(document.createdAt).toLocaleString()}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Linked transactions</p>
              <div className="mt-2 max-h-48 space-y-2 overflow-auto rounded-md border p-2">
                {allTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No transactions available.</p>
                ) : (
                  allTransactions.map((tx) => (
                    <label key={tx.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={selectedTransactionIds.includes(tx.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTransactionIds((prev) =>
                            checked === true ? [...prev, tx.id] : prev.filter((id) => id !== tx.id)
                          );
                        }}
                      />
                      <span className="leading-snug">
                        {(tx.notes ?? "").split("\n")[0] || "Transaction"} - EUR {Number(tx.amount).toLocaleString()} -{" "}
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
