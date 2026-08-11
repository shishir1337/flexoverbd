"use client";

import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from "@imagekit/next";
import { CloudUpload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { recordUploadedMedia } from "@/server/services/admin/media-upload-actions";

/** ImageKit's own ceiling on the free plan, and a sane one regardless. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type Job = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  message?: string;
};

/**
 * Upload images to ImageKit.
 *
 * The file goes from this browser straight to ImageKit — never through our
 * server — using a short-lived token minted by `/api/imagekit-auth`. That keeps
 * a 4MB photo off the Node process entirely, and keeps the private key on the
 * server where it belongs.
 *
 * Each file gets its own row with its own progress and its own failure, because
 * a batch of eight where one is too large should upload the other seven and say
 * which one did not. A single shared error for the batch would leave someone
 * re-picking all eight.
 */
export function MediaUploader({
  folder,
  onUploaded,
  compact = false,
}: {
  /** ImageKit folder, e.g. "products". Keeps the library navigable. */
  folder?: string;
  /** Fired with the new MediaAsset id, for pickers that assign immediately. */
  onUploaded?: (assetId: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);

  const patch = (id: string, next: Partial<Job>) =>
    setJobs((current) =>
      current.map((j) => (j.id === id ? { ...j, ...next } : j)),
    );

  async function uploadOne(file: File) {
    const id = `${file.name}-${file.size}-${file.lastModified}`;

    if (!ACCEPTED.includes(file.type)) {
      setJobs((c) => [
        ...c,
        {
          id,
          name: file.name,
          progress: 0,
          status: "error",
          message: "Only JPEG, PNG, WebP or AVIF.",
        },
      ]);
      return;
    }
    if (file.size > MAX_BYTES) {
      setJobs((c) => [
        ...c,
        {
          id,
          name: file.name,
          progress: 0,
          status: "error",
          message: "Larger than 25MB.",
        },
      ]);
      return;
    }

    setJobs((c) => [
      ...c.filter((j) => j.id !== id),
      { id, name: file.name, progress: 0, status: "uploading" },
    ]);

    try {
      // Fetched per file rather than once for the batch: the token is
      // short-lived, and a slow twelfth upload would otherwise fail on an
      // expiry that had nothing to do with it.
      const authResponse = await fetch("/api/imagekit-auth");
      if (!authResponse.ok) {
        throw new Error(
          authResponse.status === 503
            ? "ImageKit is not configured yet."
            : "Could not get upload permission.",
        );
      }
      const { token, expire, signature, publicKey } = await authResponse.json();

      const result = await upload({
        file,
        fileName: file.name,
        token,
        expire,
        signature,
        publicKey,
        folder,
        // ImageKit appends a suffix rather than overwriting a same-named file,
        // so re-uploading "shirt.jpg" cannot silently replace another product's
        // photo.
        useUniqueFileName: true,
        onProgress: (event) =>
          patch(id, {
            progress: Math.round((event.loaded / event.total) * 100),
          }),
      });

      const recorded = await recordUploadedMedia({
        fileId: result.fileId ?? "",
        url: result.url ?? "",
        thumbnailUrl: result.thumbnailUrl,
        width: result.width,
        height: result.height,
        mimeType: file.type,
        sizeBytes: file.size,
        folder,
        // The filename seeds the alt text server-side when this is blank.
        //
        // A filename is a poor description and prefilling one does risk making
        // the job look done. But blank alt was worse in practice: it left a red
        // "No alt text" on every gallery tile, and the warning was ignored
        // rather than acted on, so images shipped with nothing at all. A
        // filename is at least a real description a screen reader can read, and
        // it gives whoever revises it something to correct instead of a blank
        // box to compose in.
        alt: "",
        fileName: file.name,
      });

      if (!recorded.ok) {
        patch(id, { status: "error", message: recorded.error });
        return;
      }

      patch(id, { status: "done", progress: 100 });
      if (recorded.data) onUploaded?.(recorded.data.id);
    } catch (error) {
      const message =
        error instanceof ImageKitAbortError
          ? "Cancelled."
          : error instanceof ImageKitInvalidRequestError
            ? "ImageKit rejected the file."
            : error instanceof ImageKitUploadNetworkError
              ? "Network dropped. Try again."
              : error instanceof ImageKitServerError
                ? "ImageKit had a problem. Try again shortly."
                : error instanceof Error
                  ? error.message
                  : "Upload failed.";
      patch(id, { status: "error", message });
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);

    // Sequential rather than all at once: a shop uploading twenty photos over
    // Bangladeshi mobile data does better with one complete upload at a time
    // than twenty that all crawl and time out together.
    for (const file of list) {
      await uploadOne(file);
    }

    router.refresh();
    toast({
      tone: "success",
      message: `${list.length} ${list.length === 1 ? "file" : "files"} processed.`,
    });

    // Cleared so picking the same file again still fires a change event.
    if (inputRef.current) inputRef.current.value = "";
  }

  const active = jobs.filter((j) => j.status === "uploading").length;

  return (
    <div>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: the drop zone wraps a real file input, which carries the keyboard and screen-reader affordance. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-card border-2 border-dashed text-center transition-colors",
          compact ? "p-4" : "p-6",
          dragging
            ? "border-brand-500 bg-brand-soft"
            : "border-line bg-surface",
        )}
      >
        <CloudUpload
          aria-hidden
          className={cn(
            "mx-auto text-ink-4",
            compact ? "size-6" : "size-8",
            dragging && "text-brand-600",
          )}
        />
        <p className="mt-2 font-semibold text-ink text-sm">Drop images here</p>
        <p className="mt-0.5 text-2xs text-ink-3">
          JPEG, PNG, WebP or AVIF · up to 25MB each
        </p>

        <label htmlFor={inputId} className="mt-3 inline-block">
          <span
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-btn border border-line bg-surface px-3 font-semibold text-ink-2 text-sm hover:border-brand-500",
              active > 0 && "pointer-events-none opacity-40",
            )}
          >
            {active > 0 ? `Uploading ${active}…` : "Choose files"}
          </span>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            disabled={active > 0}
            onChange={(e) => void handleFiles(e.target.files)}
            className="sr-only"
          />
        </label>
      </div>

      {jobs.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {jobs.map((job) => (
            <li
              key={job.id}
              className={cn(
                "flex items-center gap-2 rounded-btn border px-2.5 py-2 text-xs",
                job.status === "error"
                  ? "border-danger/30 bg-danger-soft"
                  : "border-line bg-surface",
              )}
            >
              <span className="min-w-0 flex-1 truncate text-ink-2">
                {job.name}
              </span>

              {job.status === "uploading" && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="block h-full rounded-full bg-brand-500 transition-[width]"
                      style={{ width: `${job.progress}%` }}
                    />
                  </span>
                  <span className="tnum text-ink-3">{job.progress}%</span>
                </span>
              )}
              {job.status === "done" && (
                <span className="font-semibold text-success">Uploaded</span>
              )}
              {job.status === "error" && (
                <span className="font-semibold text-danger">{job.message}</span>
              )}

              <AdminButton
                variant="ghost"
                size="icon-sm"
                onClick={() => setJobs((c) => c.filter((j) => j.id !== job.id))}
                aria-label={`Dismiss ${job.name}`}
              >
                <X aria-hidden className="size-3.5" />
              </AdminButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
