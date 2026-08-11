import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { listBanners } from "@/server/services/admin/content";
import { listBannerImageOptions } from "@/server/services/admin/media";
import { BannerManager } from "./banner-manager";

export const instant = false;
export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  await connection();
  await requirePermission({ content: ["read"] });

  const [banners, images] = await Promise.all([
    listBanners(),
    listBannerImageOptions(),
  ]);
  const of = (placement: string) =>
    banners.filter((b) => b.placement === placement);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/content", label: "Content" }}
        title="Banners"
        subtitle="Artwork, copy and scheduling. A banner can be just a photograph — the text and button are optional."
      />

      <div className="mt-5 space-y-5">
        <BannerManager
          placement="HERO"
          title="Hero carousel"
          description="The slides at the top of the homepage. Two crops per slide — the copy sits at the bottom on phones and on the left from tablet up."
          banners={of("HERO")}
          images={images}
        />

        <BannerManager
          placement="PROMO_TILE"
          title="Promo tiles"
          description="The smaller cards below the category row."
          banners={of("PROMO_TILE")}
          images={images}
        />

        <BannerManager
          placement="WIDE"
          title="Wide banner"
          description="The full-width strip further down the homepage. Only the first live one renders."
          banners={of("WIDE")}
          images={images}
        />
      </div>
    </div>
  );
}
