"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, FileImage, FileType2, UploadCloud, Loader2, File } from "lucide-react";
import { useFileUpload } from "@/components/documents/useFileUpload";
import { DocumentItem, DocumentKind } from "@/types/documents";
import { Button } from "@/components/ui/button";

type DocumentListItem = DocumentItem & {
  transactionCount?: number;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function getPreviewIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType === "application/pdf") return FileType2;
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return FileText;
  }
  return File;
}

export default function DocumentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<"ALL" | DocumentKind>("ALL");
  const [uploadKind, setUploadKind] = useState<DocumentKind>("OTHER");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { files, dropzone, removeFile, clearFiles, uploadSelectedFiles, isUploading, progress, error } =
    useFileUpload();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  async function loadDocuments() {
    if (status !== "authenticated") return;
    setLoadingList(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filterKind !== "ALL") params.set("kind", filterKind);
      const res = await fetch(`/api/document?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch documents");
      setDocuments((data.documents ?? []) as DocumentListItem[]);
    } catch (loadError) {
      setListError(loadError instanceof Error ? loadError.message : "Failed to fetch documents");
      setDocuments([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, filterKind]);

  const filteredCountLabel = useMemo(() => `${documents.length} document${documents.length === 1 ? "" : "s"}`, [documents.length]);

  async function handleUpload() {
    setUploadError(null);
    try {
      const uploadedFiles = await uploadSelectedFiles();
      if (uploadedFiles.length === 0) return;
      const res = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          documents: uploadedFiles.map((f) => ({
            originalFileName: f.originalFileName,
            storageKey: f.storageKey,
            url: f.url,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            kind: uploadKind,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save uploaded documents");
      clearFiles();
      await loadDocuments();
    } catch (uploadErr) {
      setUploadError(uploadErr instanceof Error ? uploadErr.message : "Upload failed");
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">Documents</h1>
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Documents</h1>
        <span className="text-sm text-muted-foreground">{filteredCountLabel}</span>
      </div>

      <div className="mb-6 rounded-xl border bg-background p-4 sm:p-5">
        <div
          {...dropzone.getRootProps()}
          className={`rounded-lg border-2 border-dashed p-6 text-center transition ${
            dropzone.isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...dropzone.getInputProps()} />
          <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Drag & drop files here, or click to select</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports PDF, PNG/JPG/WEBP, DOC/DOCX. Up to 16MB per file.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="documents-upload-kind">
            Kind
          </label>
          <select
            id="documents-upload-kind"
            value={uploadKind}
            onChange={(e) => setUploadKind(e.target.value as DocumentKind)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="OTHER">Other</option>
            <option value="CONTRACT">Contract</option>
            <option value="BILL">Bill</option>
            <option value="RECEIPT">Receipt</option>
          </select>
        </div>

        {files.length > 0 ? (
          <div className="mt-4 max-h-44 space-y-2 overflow-auto rounded-md border p-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="truncate pr-3">{file.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {isUploading ? (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Uploading... {progress}%</p>
          </div>
        ) : null}

        {error || uploadError ? <p className="mt-3 text-sm text-red-500">{uploadError ?? error}</p> : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={clearFiles} disabled={isUploading || files.length === 0}>
            Clear
          </Button>
          <Button type="button" onClick={handleUpload} disabled={isUploading || files.length === 0}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Upload files
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void loadDocuments();
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:max-w-md"
          placeholder="Search by title, filename, notes..."
        />
        <div className="flex items-center gap-2">
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value as "ALL" | DocumentKind)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">All kinds</option>
            <option value="CONTRACT">Contracts</option>
            <option value="BILL">Bills</option>
            <option value="RECEIPT">Receipts</option>
            <option value="OTHER">Other</option>
          </select>
          <Button type="button" variant="outline" onClick={() => void loadDocuments()}>
            Search
          </Button>
        </div>
      </div>

      {loadingList ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">Loading list...</div>
      ) : listError ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-red-500">{listError}</div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          No documents found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => {
            const Icon = getPreviewIcon(doc.mimeType);
            return (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="rounded-xl border bg-background p-4 transition hover:bg-accent/40"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <p className="truncate font-medium">{doc.title}</p>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {doc.kind}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{doc.originalFileName}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(doc.sizeBytes)}</span>
                  <span>{doc.transactionCount ?? 0} linked tx</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
