import { requireAdmin } from "@/lib/auth/guards";
import { getNotifications } from "@/server/services/admin/notifications";

/**
 * The notification feed, polled by the bell.
 *
 * A route handler rather than a Server Action because the client polls it on a
 * timer: actions are POSTs that participate in router revalidation, which is
 * the wrong shape for a read that must not disturb the page someone is working
 * on.
 */
export async function GET() {
  await requireAdmin();
  return Response.json(await getNotifications(), {
    headers: { "Cache-Control": "no-store" },
  });
}
