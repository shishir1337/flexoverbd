"use client";

import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./index";

/**
 * Browser-side auth client. `inferAdditionalFields` carries our `phone` field
 * through so `session.user.phone` is typed on the client too.
 */
export const authClient = createAuthClient({
  plugins: [adminClient(), inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
