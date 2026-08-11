import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth needs a real URL for its own endpoints (sign-in, sign-out,
// session, admin actions), so this is one of the few places a Route Handler is
// correct rather than a Server Action.
export const { POST, GET } = toNextJsHandler(auth);
