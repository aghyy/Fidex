"use client";

import { useCallback, useMemo, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { uploadFiles } from "@/lib/uploadthing";

export type UploadedFileMeta = {
  originalFileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

const ACCEPTED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export function useFileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[], rejected: readonly FileRejection[]) => {
    if (rejected.length > 0) {
      const message = rejected[0]?.errors?.[0]?.message ?? "Unsupported file selected";
      setError(message);
      return;
    }
    setError(null);
    setFiles((prev) => {
      const merged = [...prev, ...accepted];
      return merged.slice(0, 8);
    });
  }, []);

  const dropzone = useDropzone({
    onDrop,
    maxFiles: 8,
    maxSize: 16 * 1024 * 1024,
    accept: ACCEPTED_MIME_TYPES,
  });

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
    setProgress(0);
  }, []);

  const uploadSelectedFiles = useCallback(async (): Promise<UploadedFileMeta[]> => {
    if (files.length === 0) return [];
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const uploaded: UploadedFileMeta[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
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

        uploaded.push({
          originalFileName: first.name ?? file.name,
          storageKey: first.key,
          url: first.url,
          mimeType: first.type ?? file.type ?? "application/octet-stream",
          sizeBytes: first.size ?? file.size,
        });

        const pct = Math.round(((i + 1) / files.length) * 100);
        setProgress(pct);
      }

      return uploaded;
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed";
      setError(message);
      throw uploadError;
    } finally {
      setIsUploading(false);
    }
  }, [files]);

  return useMemo(
    () => ({
      files,
      error,
      isUploading,
      progress,
      dropzone,
      removeFile,
      clearFiles,
      uploadSelectedFiles,
      acceptedMimeTypes: ACCEPTED_MIME_TYPES,
    }),
    [files, error, isUploading, progress, dropzone, removeFile, clearFiles, uploadSelectedFiles]
  );
}
