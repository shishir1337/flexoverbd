"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { inputCls } from "@/components/admin/form";
import { AdminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { saveTrackingSettings } from "@/server/services/admin/tracking-actions";
import type { TrackingStatus } from "@/server/services/tracking-settings";

/**
 * Meta tracking, set up by the shop owner rather than a developer.
 *
 * Written for someone who has never seen an API token: every field says where
 * to find its value in Events Manager, and the copy explains what breaks if it
 * is wrong rather than naming the variable it maps to.
 *
 * The access token is write-only. It is never sent to this component, so the
 * field starts blank even when a token is saved — "Saved" beside the label is
 * how you know one exists. Leaving it blank keeps the current one; clearing it
 * takes a deliberate second action.
 */
export function TrackingForm({ status }: { status: TrackingStatus }) {
  const router = useRouter();
  const ids = {
    pixel: useId(),
    token: useId(),
    test: useId(),
  };

  const [pixelId, setPixelId] = useState(status.pixelId);
  const [token, setToken] = useState("");
  const [testCode, setTestCode] = useState(status.testEventCode);
  const [clearToken, setClearToken] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const live = Boolean(pixelId && (status.hasToken || token));

  function submit() {
    setErrors({});
    setSaved(false);
    startTransition(async () => {
      const result = await saveTrackingSettings({
        metaPixelId: pixelId,
        metaAccessToken: token,
        metaTestEventCode: testCode,
        clearToken,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? { form: result.error });
        return;
      }
      setToken("");
      setClearToken(false);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 className="font-extrabold text-ink">Facebook &amp; Instagram ads</h2>
      <p className="mt-0.5 text-ink-3 text-sm">
        Lets Meta see which ads lead to real orders. Without it, ad reporting
        undercounts your sales and the algorithm optimises against worse data.
      </p>

      {live ? (
        <p className="mt-3 flex items-start gap-2.5 rounded-btn bg-success-soft px-3 py-2.5 text-ink-2 text-sm">
          <CheckCircle2
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-success"
          />
          <span>
            <strong className="font-semibold text-ink">Connected.</strong>{" "}
            Orders, add-to-carts and product views are being sent to Meta.
          </span>
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2.5 rounded-btn border border-warn bg-warn-soft px-3 py-2.5 text-ink-2 text-sm">
          <AlertCircle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-warn"
          />
          <span>
            <strong className="font-semibold text-ink">Not connected.</strong>{" "}
            Nothing is being sent to Meta yet. Fill in both boxes below.
          </span>
        </p>
      )}

      <a
        href="https://business.facebook.com/events_manager2"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 font-semibold text-brand-on text-sm tap hover:underline"
      >
        Open Meta Events Manager
        <ExternalLink aria-hidden className="size-3.5" />
      </a>

      {errors.form && (
        <p
          role="alert"
          className="mt-3 rounded-btn bg-danger-soft px-3 py-2 font-medium text-danger text-sm"
        >
          {errors.form}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor={ids.pixel}
            className="block font-semibold text-ink text-sm"
          >
            Pixel ID (Dataset ID)
          </label>
          <p className="mt-0.5 text-2xs text-ink-3">
            Events Manager → your pixel → the long number under its name.
          </p>
          <input
            id={ids.pixel}
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            disabled={status.pixelFromEnv}
            inputMode="numeric"
            placeholder="1234567890123456"
            className={cn(inputCls(errors.metaPixelId), "mt-1.5 font-mono")}
          />
          {errors.metaPixelId && (
            <p role="alert" className="mt-1 font-medium text-danger text-xs">
              {errors.metaPixelId}
            </p>
          )}
          {status.pixelFromEnv && (
            <p className="mt-1 flex items-center gap-1 text-2xs text-ink-3">
              <Lock aria-hidden className="size-3" />
              Set by the server configuration, so it cannot be edited here.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={ids.token}
            className="flex items-center gap-2 font-semibold text-ink text-sm"
          >
            Conversions API access token
            {status.hasToken && (
              <span className="rounded-chip bg-success-soft px-1.5 py-0.5 font-bold text-2xs text-success">
                Saved
              </span>
            )}
          </label>
          <p className="mt-0.5 text-2xs text-ink-3">
            Events Manager → your pixel → Settings → Conversions API →{" "}
            <strong className="font-semibold text-ink-2">
              Generate access token
            </strong>
            . It is a long string of letters and numbers.
          </p>
          <input
            id={ids.token}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={status.tokenFromEnv || clearToken}
            autoComplete="off"
            placeholder={
              status.hasToken
                ? "Leave blank to keep the saved token"
                : "Paste the token here"
            }
            className={cn(inputCls(errors.metaAccessToken), "mt-1.5 font-mono")}
          />
          {status.tokenFromEnv ? (
            <p className="mt-1 flex items-center gap-1 text-2xs text-ink-3">
              <Lock aria-hidden className="size-3" />
              Set by the server configuration, so it cannot be edited here.
            </p>
          ) : (
            <p className="mt-1 text-2xs text-ink-3">
              For your security this is never shown again after saving. Paste a
              new one to replace it.
            </p>
          )}

          {status.hasToken && !status.tokenFromEnv && (
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-ink-2 text-sm">
              <input
                type="checkbox"
                checked={clearToken}
                onChange={(e) => {
                  setClearToken(e.target.checked);
                  if (e.target.checked) setToken("");
                }}
                className="size-4 shrink-0 accent-brand-600"
              />
              Remove the saved token and stop sending orders to Meta
            </label>
          )}
        </div>

        <div>
          <label
            htmlFor={ids.test}
            className="block font-semibold text-ink text-sm"
          >
            Test event code{" "}
            <span className="font-normal text-ink-3">— optional</span>
          </label>
          <p className="mt-0.5 text-2xs text-ink-3">
            Only while checking the setup works. Events Manager → Test Events.
          </p>
          <input
            id={ids.test}
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            disabled={status.tokenFromEnv}
            placeholder="TEST12345"
            className={cn(inputCls(), "mt-1.5 font-mono")}
          />
          {testCode && (
            <p className="mt-1.5 flex items-start gap-2 rounded-btn border border-brand-300 bg-brand-soft px-2.5 py-2 text-2xs text-ink-2">
              <FlaskConical
                aria-hidden
                className="mt-px size-3.5 shrink-0 text-brand-on"
              />
              <span>
                While this is filled in, orders show only in{" "}
                <strong className="font-semibold text-ink">Test Events</strong>{" "}
                and are{" "}
                <strong className="font-semibold text-ink">
                  not counted as real conversions
                </strong>
                . Clear it once you have seen a test order arrive.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <AdminButton
          variant="primary"
          size="md"
          onClick={submit}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save"}
        </AdminButton>
        {saved && (
          <span className="font-semibold text-success text-sm">Saved.</span>
        )}
      </div>
    </section>
  );
}
