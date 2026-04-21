"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, FileImage, FileType2, Upload, File, X, Loader2, Search } from "lucide-react";
import { DocumentItem, DocumentKind } from "@/types/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFiles } from "@/lib/uploadthing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadList,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadItemMetadata,
  FileUploadItemProgress,
  FileUploadItemDelete,
} from "@/components/ui/file-upload";
import Skeleton from "@/components/ui/skeleton";

function DocumentsListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl glass-tile p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Skeleton className="h-5 w-5 shrink-0 rounded" />
              <Skeleton className="h-5 max-w-[70%] flex-1" />
            </div>
            <Skeleton className="h-5 w-14 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-3 w-full max-w-[90%]" />
          <div className="mt-2 flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsPageSessionSkeleton() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="mb-6 rounded-xl glass-card p-4 sm:p-5">
        <Skeleton className="h-36 w-full rounded-lg sm:h-32" />
        <div className="mt-4 flex justify-end gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full sm:w-52" />
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
        </div>
      </div>
      <DocumentsListSkeleton />
    </div>
  );
}

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadKindsByFile, setUploadKindsByFile] = useState<Record<string, DocumentKind>>({});
  const [isUploading, setIsUploading] = useState(false);

  function getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function handleUploadQueueChange(files: File[]) {
    setUploadQueue(files);
    setUploadKindsByFile((prev) => {
      const next: Record<string, DocumentKind> = {};
      for (const file of files) {
        const key = getFileKey(file);
        next[key] = prev[key] ?? "OTHER";
      }
      return next;
    });
  }

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

  async function handleSaveQueuedFiles() {
    if (uploadQueue.length === 0) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const uploadedDocs: Array<{
        originalFileName: string;
        storageKey: string;
        url: string;
        mimeType: string;
        sizeBytes: number;
        kind: DocumentKind;
      }> = [];

      for (const file of uploadQueue) {
        const response = await (uploadFiles as unknown as (
          endpoint: "documentUploader",
          opts: { files: File[] }
        ) => Promise<
          Array<{
            key: string;
            url: string;
            name?: string;
            type?: string;
            size?: number;
          }>
        >)("documentUploader", { files: [file] });

        const first = response?.[0];
        if (!first?.key || !first?.url) {
          throw new Error("Upload failed");
        }

        const fileKey = getFileKey(file);
        uploadedDocs.push({
          originalFileName: first.name ?? file.name,
          storageKey: first.key,
          url: first.url,
          mimeType: first.type ?? file.type ?? "application/octet-stream",
          sizeBytes: first.size ?? file.size,
          kind: uploadKindsByFile[fileKey] ?? "OTHER",
        });
      }

      const res = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documents: uploadedDocs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save uploaded documents");

      setUploadQueue([]);
      setUploadKindsByFile({});
      await loadDocuments();
    } catch (uploadErr) {
      setUploadError(uploadErr instanceof Error ? uploadErr.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return <DocumentsPageSessionSkeleton />;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Documents</h1>
        <span className="text-sm text-muted-foreground">{filteredCountLabel}</span>
      </div>

      <div className="mb-6 rounded-xl glass-card p-4 sm:p-5">
        <FileUpload
          value={uploadQueue}
          onValueChange={handleUploadQueueChange}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          maxFiles={8}
          maxSize={16 * 1024 * 1024}
          multiple
          disabled={isUploading}
          onFileReject={(_, message) => setUploadError(message)}
        >
          <FileUploadDropzone className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Drag & drop files here, or click to select</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports PDF, PNG/JPG/WEBP, DOC/DOCX. Up to 16MB per file.
            </p>
          </FileUploadDropzone>

          <FileUploadList className="mt-3">
            {uploadQueue.map((file) => (
              <FileUploadItem key={getFileKey(file)} value={file}>
                <FileUploadItemPreview />
                <div className="min-w-0 flex-1">
                  <FileUploadItemMetadata />
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Kind</label>
                    <select
                      value={uploadKindsByFile[getFileKey(file)] ?? "OTHER"}
                      onChange={(e) =>
                        setUploadKindsByFile((prev) => ({
                          ...prev,
                          [getFileKey(file)]: e.target.value as DocumentKind,
                        }))
                      }
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      disabled={isUploading}
                    >
                      <option value="OTHER">Other</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="BILL">Bill</option>
                      <option value="RECEIPT">Receipt</option>
                    </select>
                  </div>
                  <div className="mt-1">
                    <FileUploadItemProgress />
                  </div>
                </div>
                <FileUploadItemDelete asChild>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={isUploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </FileUploadItemDelete>
              </FileUploadItem>
            ))}
          </FileUploadList>
        </FileUpload>

        {uploadError ? <p className="mt-3 text-sm text-red-500">{uploadError}</p> : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading || uploadQueue.length === 0}
            onClick={() => {
              setUploadQueue([]);
              setUploadKindsByFile({});
            }}
          >
            Clear queued files
          </Button>
          <Button type="button" onClick={handleSaveQueuedFiles} disabled={isUploading || uploadQueue.length === 0}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save files
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-52">
          <Select
            value={filterKind}
            onValueChange={(value) => setFilterKind(value as "ALL" | DocumentKind)}
          >
            <SelectTrigger className="glass-tile bg-white/35 dark:bg-black/25 shadow-none backdrop-blur-sm">
              <SelectValue placeholder="Filter by kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All kinds</SelectItem>
              <SelectItem value="CONTRACT">Contracts</SelectItem>
              <SelectItem value="BILL">Bills</SelectItem>
              <SelectItem value="RECEIPT">Receipts</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void loadDocuments();
            }}
            className="w-full glass-tile bg-white/35 dark:bg-black/25 shadow-none backdrop-blur-sm"
            placeholder="Search by title, filename, notes..."
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void loadDocuments()}
            aria-label="Search documents"
            className="glass-tile glass-tile-hover h-9 aspect-square bg-white/35 dark:bg-black/25 shadow-none backdrop-blur-sm"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loadingList ? (
        <DocumentsListSkeleton />
      ) : listError ? (
        <div className="rounded-xl glass-tile p-6 text-sm text-red-500">{listError}</div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl glass-tile p-6 text-sm text-muted-foreground">
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
                className="rounded-xl glass-tile glass-tile-hover p-4"
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
