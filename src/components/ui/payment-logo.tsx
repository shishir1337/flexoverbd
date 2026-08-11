import { Banknote } from "lucide-react";
import Image from "next/image";
import { resolvePublicImage } from "@/lib/public-files";
import type { PaymentMethod } from "@/lib/site";

/**
 * A payment mark on a white tile — the convention every checkout page uses,
 * because the official logos are drawn to sit on white.
 *
 * Renders the real logo once one exists at `public/images/payments/<slug>.*`,
 * and a brand-coloured wordmark until then. Visa and Mastercard ship with
 * their genuine marks; the Bangladeshi wallets need their official assets
 * dropping in (see `paymentMethods` in lib/site.ts).
 *
 * The tile is identical either way, so the strip reads as one set even while
 * it is half real logos and half wordmarks — and adding an asset is a file
 * copy, not a code change.
 */
export function PaymentLogo({ method }: { method: PaymentMethod }) {
  const logo = resolvePublicImage(`/images/payments/${method.slug}.svg`);

  return (
    <span
      title={method.name}
      className="inline-flex h-9 min-w-14 items-center justify-center rounded-md border border-line bg-surface px-2"
    >
      {logo ? (
        // Square box on purpose: these marks are drawn on a square canvas with
        // no intrinsic width/height, so a wide box would `object-contain` them
        // down to their height and waste most of the tile.
        <span className="relative size-7">
          <Image
            src={logo}
            alt={method.name}
            fill
            sizes="28px"
            className="object-contain"
          />
        </span>
      ) : method.slug === "cod" ? (
        <span
          className="flex items-center gap-1 text-2xs font-extrabold"
          style={{ color: method.color }}
        >
          <Banknote aria-hidden className="size-4" strokeWidth={2} />
          {method.wordmark}
          <span className="sr-only">{method.name}</span>
        </span>
      ) : (
        <span
          className="text-2xs font-extrabold tracking-tight whitespace-nowrap"
          style={{ color: method.color }}
        >
          {method.wordmark}
        </span>
      )}
    </span>
  );
}
