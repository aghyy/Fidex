import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
  documentUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 8 },
    pdf: { maxFileSize: "16MB", maxFileCount: 8 },
    blob: { maxFileSize: "16MB", maxFileCount: 8 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        userId: metadata.userId,
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
