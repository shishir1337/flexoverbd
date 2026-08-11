import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { listReviewScreenshots } from "@/server/services/admin/content";
import { ScreenshotManager } from "./screenshot-manager";

export const instant = false;
export const metadata: Metadata = { title: "Review screenshots" };

export default async function AdminScreenshotsPage() {
  await connection();
  await requirePermission({ content: ["read"] });

  const rows = await listReviewScreenshots();
  const awaiting = rows.filter((r) => !r.consentObtained).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/content", label: "Content" }}
        title="Review screenshots"
        subtitle="The wall of customer messages on the homepage."
      />

      <p className="mt-4 flex items-start gap-2.5 rounded-card border border-warn bg-warn-soft px-3.5 py-3 text-ink-2 text-sm">
        <ShieldAlert
          aria-hidden
          className="mt-0.5 size-4.5 shrink-0 text-warn"
        />
        <span>
          These are photographs of private conversations with named people. Get
          their permission before publishing, and tick the consent box only once
          you actually have it — publishing is blocked until you do.
          {awaiting > 0 && (
            <strong className="mt-1 block font-semibold">
              {awaiting}{" "}
              {awaiting === 1 ? "screenshot has" : "screenshots have"} no
              consent recorded.
            </strong>
          )}
        </span>
      </p>

      <div className="mt-4">
        <ScreenshotManager rows={rows} />
      </div>
    </div>
  );
}
