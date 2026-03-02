"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Skeleton from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { IconFileExport, IconArrowLeft } from "@tabler/icons-react";

export default function FinancialStatementPage() {
  const { status } = useSession();
  const router = useRouter();
  const now = new Date();
  const currentYear = now.getFullYear();

  const [from, setFrom] = useState(`${currentYear}-01-01`);
  const [to, setTo] = useState(
    `${currentYear}-12-31`
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  const handleDownload = async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/financial-statement?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `Finanzuebersicht_${from}_${to}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <h1 className="text-2xl font-bold mb-2">Finanzübersicht (PDF)</h1>
      <p className="text-muted-foreground mb-6">
        Erstellen Sie eine PDF-Finanzübersicht für Ihren Steuerberater oder das Finanzamt. Enthält Kontostände, Einnahmen und Ausgaben nach Kategorie sowie eine Transaktionsliste.
      </p>

      <div className="rounded-xl border bg-background p-6 max-w-md">
        <div className="space-y-4">
          <div>
            <label htmlFor="from" className="block text-sm font-medium mb-1">
              Von
            </label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="to" className="block text-sm font-medium mb-1">
              Bis
            </label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            onClick={handleDownload}
            disabled={loading}
            className="w-full"
          >
            <IconFileExport className="h-4 w-4" />
            {loading ? "Wird erstellt…" : "PDF herunterladen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
