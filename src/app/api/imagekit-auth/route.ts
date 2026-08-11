import { getUploadAuthParams } from "@imagekit/next/server";
import { env } from "@/env";
import { requirePermission } from "@/lib/auth/guards";

/**
 * One-time upload credentials for the browser.
 *
 * Uploads go straight from the admin's browser to ImageKit rather than through
 * this server: a 4MB product photo travelling via a Node process is bandwidth
 * and memory spent for nothing, and on a serverless platform it is also a
 * request-body limit waiting to be hit. What the browser cannot have is the
 * private key, so it asks here for a short-lived token signed with it.
 *
 * **This route is authenticated, unlike the example in ImageKit's own docs.**
 * An open endpoint hands anyone on the internet the ability to upload into this
 * account — burning the storage quota, and worse, parking arbitrary files on a
 * URL that carries the shop's name. `requirePermission` throws for anybody
 * without media rights, so a token is only ever minted for staff.
 */
export async function GET() {
  await requirePermission({ media: ["upload"] });

  if (!env.IMAGEKIT_PRIVATE_KEY || !env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY) {
    return Response.json(
      { error: "ImageKit is not configured on this environment." },
      { status: 503 },
    );
  }

  const { token, expire, signature } = getUploadAuthParams({
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
    publicKey: env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
  });

  return Response.json({
    token,
    expire,
    signature,
    publicKey: env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
  });
}
