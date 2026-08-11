"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setProductArchived } from "@/server/services/admin/product-actions";

/**
 * Archive, not delete.
 *
 * Orders reference products, and search results and inbound links keep pointing
 * at the URL. A hard delete breaks both permanently, so the destructive-looking
 * action here is reversible by design — which is also why it needs no scary
 * confirmation.
 */
export function ArchiveToggle({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setProductArchived({ id, archived: !archived });
          router.refresh();
        })
      }
    >
      {archived ? (
        <>
          <ArchiveRestore aria-hidden className="size-4" />
          Restore
        </>
      ) : (
        <>
          <Archive aria-hidden className="size-4" />
          Archive
        </>
      )}
    </Button>
  );
}
