import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getSiteSettings } from "@/server/services/settings";

/**
 * The supplied logo file is a full lock-up (mark + wordmark + tagline) on a
 * black disc, which turns to mush below ~120px. So the disc is used as the
 * mark and the wordmark is set in live type beside it — sharp at every size,
 * selectable, and translatable.
 */
export async function Logo({
  showWordmark = true,
  className,
  markSize = 40,
}: {
  showWordmark?: boolean;
  className?: string;
  markSize?: number;
}) {
  const site = await getSiteSettings();

  return (
    <Link
      href="/"
      aria-label={`${site.name} — home`}
      className={cn("flex min-h-11 shrink-0 items-center gap-2 tap", className)}
    >
      <Image
        src="/icon.jpg"
        alt=""
        width={markSize}
        height={markSize}
        priority
        className="rounded-full ring-1 ring-black/5"
        style={{ width: markSize, height: markSize }}
      />
      {showWordmark && (
        <span className="font-display text-[17px] leading-none font-extrabold tracking-tight text-ink">
          Flex<span className="text-brand-600">Over</span>
          <span className="ml-1 align-top text-[10px] font-bold tracking-[0.12em] text-ink-3">
            BD
          </span>
        </span>
      )}
    </Link>
  );
}
