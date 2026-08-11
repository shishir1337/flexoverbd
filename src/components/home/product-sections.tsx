import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product/product-card";
import { Rail, SectionHeader } from "@/components/ui/primitives";
import type { Product } from "@/data/types";
import { cn } from "@/lib/utils";

function ViewAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-1 text-sm font-bold text-brand-on tap hover:text-brand-300"
    >
      View all
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

/** Horizontal scroller — for "browse and move on" sections. */
export function ProductRail({
  id,
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  href,
  products,
}: {
  id: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  href: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-heading`} className="container-page">
      <SectionHeader
        eyebrow={
          eyebrow && (
            <>
              {Icon && <Icon aria-hidden className="size-4" />}
              {eyebrow}
            </>
          )
        }
        title={title}
        subtitle={subtitle}
        action={<ViewAll href={href} />}
      />
      {/* The heading id lives on a hidden span so SectionHeader stays generic */}
      <span id={`${id}-heading`} className="sr-only">
        {title}
      </span>

      <Rail label={title.toLowerCase()}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            className="rail-item w-[46vw] max-w-52 sm:w-48 lg:w-56"
          />
        ))}
      </Rail>
    </section>
  );
}

/** Two-up on phones, four-up on desktop — for "stop and shop" sections. */
export function ProductGrid({
  id,
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  href,
  products,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  href: string;
  products: Product[];
  className?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn("container-page", className)}
    >
      <SectionHeader
        eyebrow={
          eyebrow && (
            <>
              {Icon && <Icon aria-hidden className="size-4" />}
              {eyebrow}
            </>
          )
        }
        title={title}
        subtitle={subtitle}
        action={<ViewAll href={href} />}
      />
      <span id={`${id}-heading`} className="sr-only">
        {title}
      </span>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

/** Used by loading.tsx so the shell above the fold never jumps. */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => `skeleton-${i}`).map((key) => (
        <ProductCardSkeleton key={key} />
      ))}
    </div>
  );
}
