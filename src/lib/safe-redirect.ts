/**
 * Sanitise a `?next=` destination before redirecting to it.
 *
 * Sign-in carries the page you were trying to reach so you land back there
 * afterwards, and that parameter is attacker-controlled: a link to
 * `/login?next=https://evil.example/pay` turns our own domain into the first
 * hop of a phishing flow, and the padlock plus the real FlexOver URL in the
 * address bar is exactly what makes it convincing.
 *
 * So only same-origin *paths* are honoured. Anything else falls back to the
 * account page rather than erroring — a mangled `next` is not worth a dead end
 * for someone who just signed in successfully.
 */
const FALLBACK = "/account";

export function safeRedirect(next: string | null | undefined): string {
  if (!next) return FALLBACK;

  // Must be a path, not a URL. This rejects `https://evil.example`,
  // `//evil.example` (protocol-relative, the one people forget) and anything
  // with a scheme such as `javascript:`.
  if (!next.startsWith("/") || next.startsWith("//")) return FALLBACK;

  // A backslash is treated as a slash by some browsers when parsing an
  // authority, so `/\evil.example` can escape the origin in exactly the way
  // `//evil.example` does.
  if (next.includes("\\")) return FALLBACK;

  // Never bounce back into the auth pages themselves — that loops.
  const path = next.split("?")[0];
  if (["/login", "/register", "/reset-password"].includes(path)) {
    return FALLBACK;
  }

  return next;
}
