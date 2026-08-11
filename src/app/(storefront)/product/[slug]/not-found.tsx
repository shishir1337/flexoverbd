import { PackageX } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="container-page flex flex-col items-center py-20 text-center lg:py-28">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2">
        <PackageX aria-hidden className="size-7 text-ink-4" />
      </span>
      <h1 className="mt-4 text-xl font-extrabold text-ink sm:text-2xl">
        We couldn&apos;t find that product
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-2">
        It may have sold out or been renamed. Browse the categories to find
        something similar.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/" className={buttonStyles("primary", "md")}>
          Back to home
        </Link>
        <Link href="/categories" className={buttonStyles("secondary", "md")}>
          Browse categories
        </Link>
      </div>
    </div>
  );
}
