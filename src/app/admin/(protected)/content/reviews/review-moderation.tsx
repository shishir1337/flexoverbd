"use client";

import {
  BadgeCheck,
  Check,
  EyeOff,
  MessageSquare,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Chip, EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { AdminReviewRow } from "@/server/services/admin/content";
import {
  deleteReview,
  setReviewApproved,
} from "@/server/services/admin/content-actions";

/**
 * Review moderation.
 *
 * Split into a queue and an archive rather than one list with a filter: the
 * pending ones are a job with an end, and seeing the count go to zero is the
 * point. Published reviews stay reachable below so a bad one can be pulled
 * without hunting for it.
 *
 * Deleting is offered as well as hiding because the two are genuinely
 * different — hiding is an editorial call, deleting is for a review that
 * should never have been written down at all (abuse, a phone number, someone's
 * address).
 */
export function ReviewModeration({ reviews }: { reviews: AdminReviewRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const queue = reviews.filter((r) => !r.isApproved);
  const published = reviews.filter((r) => r.isApproved);

  function setApproved(row: AdminReviewRow, isApproved: boolean) {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await setReviewApproved({ id: row.id, isApproved });
      setBusyId(null);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({
        tone: "success",
        message: isApproved
          ? "Published. It is live on the product page."
          : "Hidden from the product page.",
      });
      router.refresh();
    });
  }

  async function remove(row: AdminReviewRow) {
    const ok = await confirm({
      title: "Delete this review?",
      body: `${row.authorName}'s review of ${row.productTitle} will be removed permanently. Hide it instead if you only want it off the site.`,
    });
    if (!ok) return;

    setBusyId(row.id);
    startTransition(async () => {
      const result = await deleteReview(row.id);
      setBusyId(null);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: "Review deleted." });
      router.refresh();
    });
  }

  function Card({ row }: { row: AdminReviewRow }) {
    const busy = pending && busyId === row.id;

    return (
      <li
        className={cn(
          "rounded-card border bg-surface p-3.5",
          row.isApproved ? "border-line" : "border-warn/40",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink text-sm">
                {row.authorName}
              </span>
              {row.isVerified && (
                <Chip tone="success">
                  <BadgeCheck aria-hidden className="size-3" />
                  Verified buyer
                </Chip>
              )}
              {!row.isApproved && <Chip tone="warn">Pending</Chip>}
            </p>
            <p className="mt-0.5 truncate text-2xs text-ink-3">
              {row.productSlug ? (
                <Link
                  href={`/product/${row.productSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink hover:underline"
                >
                  {row.productTitle}
                </Link>
              ) : (
                row.productTitle
              )}
              {row.location && ` · ${row.location}`} · {row.createdAt}
            </p>
          </div>

          <span
            role="img"
            aria-label={`${row.rating} out of 5`}
            className="flex shrink-0 items-center gap-0.5"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                aria-hidden
                className={cn(
                  "size-3.5",
                  n <= row.rating ? "fill-gold text-gold" : "text-ink-4",
                )}
              />
            ))}
          </span>
        </div>

        <p className="mt-2 text-ink-2 text-sm leading-relaxed">{row.body}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {row.isApproved ? (
            <button
              type="button"
              onClick={() => setApproved(row, false)}
              disabled={busy}
              className={adminButton("secondary")}
            >
              <EyeOff aria-hidden className="size-4" />
              Hide
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setApproved(row, true)}
              disabled={busy}
              className={adminButton("primary")}
            >
              <Check aria-hidden className="size-4" />
              {busy ? "Publishing…" : "Publish"}
            </button>
          )}
          <button
            type="button"
            onClick={() => remove(row)}
            disabled={busy}
            className={adminButton("danger-soft")}
          >
            <Trash2 aria-hidden className="size-4" />
            Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      {dialog}

      <section>
        <h2 className="font-extrabold text-ink text-sm">
          Waiting for you
          {queue.length > 0 && (
            <span className="ml-2 rounded-chip bg-warn-soft px-1.5 py-0.5 font-semibold text-2xs text-warn tnum">
              {queue.length}
            </span>
          )}
        </h2>

        {queue.length === 0 ? (
          <EmptyState
            className="mt-2"
            icon={MessageSquare}
            title="Nothing waiting"
            body="New reviews land here before they appear on the site."
          />
        ) : (
          <ul className="mt-2 space-y-2">
            {queue.map((row) => (
              <Card key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      {published.length > 0 && (
        <section>
          <h2 className="font-extrabold text-ink text-sm">
            Published
            <span className="ml-2 font-normal text-2xs text-ink-3 tnum">
              {published.length}
            </span>
          </h2>
          <ul className="mt-2 space-y-2">
            {published.map((row) => (
              <Card key={row.id} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
