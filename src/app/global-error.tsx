"use client";

/**
 * Last line of defence: an error in the root layout itself, where the normal
 * error boundary cannot help because the layout that would host it is the thing
 * that failed. It therefore has to render its own <html> and <body>.
 *
 * No shared components, no fonts, no design tokens are used here on purpose —
 * if the layout failed, anything it provides may be exactly what is broken.
 * Styles are inline for the same reason.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1rem",
          background: "#fff",
          color: "#14171f",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <main>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            FlexOver BD is temporarily unavailable
          </h1>
          <p
            style={{
              margin: "0.75rem 0 1.5rem",
              color: "#5b6172",
              fontSize: "0.9375rem",
              lineHeight: 1.5,
            }}
          >
            We hit an unexpected problem. Please try again in a moment.
          </p>

          <button
            type="button"
            onClick={retry}
            style={{
              minHeight: "44px",
              padding: "0 1.25rem",
              border: 0,
              borderRadius: "0.625rem",
              background: "#e67700",
              color: "#fff",
              fontSize: "0.9375rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>

          <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
            <a href="tel:+8801738121614" style={{ color: "#b35a00" }}>
              +880 1738-121614
            </a>
          </p>

          {error.digest && (
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                color: "#8b90a0",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
