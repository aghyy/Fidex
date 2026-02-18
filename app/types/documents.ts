export type DocumentKind = "CONTRACT" | "BILL" | "RECEIPT" | "OTHER";

export type DocumentItem = {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  originalFileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
  createdAt: string;
  updatedAt: string;
};

export type UploadedDocumentDraft = {
  title?: string;
  notes?: string;
  originalFileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind?: DocumentKind;
};
