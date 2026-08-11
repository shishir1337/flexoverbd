import { ImageUp, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MediaUploader } from "@/components/admin/media-uploader";
import { PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { listMedia } from "@/server/services/admin/media";
import { MediaGrid } from "./media-grid";

export const instant = false;
export const metadata: Metadata = { title: "Media" };

export default async function AdminMediaPage(props: PageProps<"/admin/media">) {
  await connection();
  await requirePermission({ media: ["read"] });

  const sp = await props.searchParams;
  const folder = typeof sp.folder === "string" ? sp.folder : undefined;
  const q = typeof sp.q === "string" ? sp.q : "";
  const demoOnly = sp.demo === "1";
  const page = Number(sp.page) || 1;

  // Presence of the keys, not their validity — a wrong key fails loudly at
  // upload time, which is a better place to find out than a silent no-op.
  const uploadReady = Boolean(
    process.env.IMAGEKIT_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
  );

  const { assets, total, pageCount, folders, demoTotal } = await listMedia({
    folder,
    q,
    demoOnly,
    page,
  });

  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      folder,
      q,
      demo: demoOnly ? "1" : undefined,
      ...next,
    };
    for (const [k, v] of Object.entries(merged))
      if (v) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/admin/media?${qs}` : "/admin/media";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Media"
        subtitle={`${total} ${total === 1 ? "image" : "images"}${
          folder ? ` in ${folder}` : ""
        }.`}
      />

      {!uploadReady && (
        <p className="mt-4 flex items-start gap-2.5 rounded-card border border-warn bg-warn-soft px-3.5 py-3 text-ink-2 text-sm">
          <ImageUp aria-hidden className="mt-0.5 size-4.5 shrink-0 text-warn" />
          <span>
            <strong className="font-semibold text-ink">
              ImageKit is not configured.
            </strong>{" "}
            Add IMAGEKIT_PRIVATE_KEY, NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY and
            NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT to the environment, then restart.
            Until then images cannot be uploaded.
          </span>
        </p>
      )}

      {uploadReady && (
        <div className="mt-4">
          <MediaUploader folder={folder ?? "uploads"} />
        </div>
      )}

      <p className="mt-4 flex items-start gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3 text-ink-2 text-sm">
        <ImageUp aria-hidden className="mt-0.5 size-4.5 shrink-0 text-ink-4" />
        <span>
          {demoTotal > 0 && (
            <>
              {" "}
              <Link
                href={href({
                  demo: demoOnly ? undefined : "1",
                  page: undefined,
                })}
                className="font-semibold text-brand-on underline"
              >
                {demoTotal} {demoTotal === 1 ? "image is" : "images are"} still
                placeholders
              </Link>{" "}
              waiting for the real artwork.
            </>
          )}
        </span>
      </p>

      <form method="get" className="mt-4 flex gap-2">
        {folder && <input type="hidden" name="folder" value={folder} />}
        {demoOnly && <input type="hidden" name="demo" value="1" />}
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-ink-4"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search alt text or filename"
            aria-label="Search media"
            className="h-10 w-full rounded-btn border border-line bg-surface pl-9 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className={adminButton("secondary", "md", "shrink-0")}
        >
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link
          href={href({ folder: undefined, page: undefined })}
          className={cn(
            "rounded-chip border px-3 py-1.5 font-semibold text-sm tap",
            !folder
              ? "border-brand-500 bg-brand-soft text-brand-on"
              : "border-line text-ink-2 hover:border-line-strong",
          )}
        >
          All
        </Link>
        {folders.map((f) => (
          <Link
            key={f.folder}
            href={href({ folder: f.folder, page: undefined })}
            className={cn(
              "rounded-chip border px-3 py-1.5 font-semibold text-sm tap",
              folder === f.folder
                ? "border-brand-500 bg-brand-soft text-brand-on"
                : "border-line text-ink-2 hover:border-line-strong",
            )}
          >
            {f.folder || "uncategorised"}{" "}
            <span className="font-normal text-ink-3 tnum">{f.count}</span>
            {f.demoCount > 0 && (
              <span className="ml-1 font-semibold text-warn tnum">
                {f.demoCount}★
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <MediaGrid assets={assets} />
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-5 flex items-center justify-between gap-3"
        >
          {page > 1 ? (
            <Link
              href={href({ page: String(page - 1) })}
              className="h-11 rounded-btn border border-line px-4 font-semibold text-ink-2 text-sm leading-[2.75rem] tap"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-3 text-sm tnum">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={href({ page: String(page + 1) })}
              className="h-11 rounded-btn border border-line px-4 font-semibold text-ink-2 text-sm leading-[2.75rem] tap"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
