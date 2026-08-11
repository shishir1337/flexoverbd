import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { listReviews } from "@/server/services/admin/content";
import { ReviewModeration } from "./review-moderation";

export const instant = false;
export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  await connection();
  await requirePermission({ content: ["read"] });

  const reviews = await listReviews();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/content", label: "Content" }}
        title="Reviews"
        subtitle="Customers can only review a product they have had delivered. Nothing appears on the site until you publish it."
      />

      <div className="mt-4">
        <ReviewModeration reviews={reviews} />
      </div>
    </div>
  );
}
