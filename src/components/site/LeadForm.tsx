"use client";

import { useState, type FormEvent } from "react";
import type { LeadFormCopy } from "@/site.config";

type Status = "idle" | "sending" | "done" | "error";

/**
 * Email capture wired to POST /api/leads, which forwards the lead to the
 * dashboard CRM (see README "Lead capture"). Copy comes from site.config.ts.
 */
export default function LeadForm({ copy }: { copy: LeadFormCopy }) {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? "").trim(),
          first_name: String(data.get("first_name") ?? "").trim() || undefined,
          website: String(data.get("website") ?? ""),
          form: copy.formId,
          source: copy.source,
          capture_page: window.location.pathname,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean };
      setStatus(response.ok && result.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p role="status" className="rounded-card border border-line bg-surface px-5 py-4 text-ink shadow-lift">
        {copy.successMessage}
      </p>
    );
  }

  const field =
    "w-full min-w-0 rounded-field border border-line bg-surface px-4 py-3 text-base text-ink shadow-lift outline-none placeholder:text-faint focus:border-line-strong";

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        {copy.askForName && (
          <label className="sm:w-2/5">
            <span className="sr-only">{copy.namePlaceholder}</span>
            <input
              name="first_name"
              type="text"
              autoComplete="given-name"
              placeholder={copy.namePlaceholder}
              className={field}
            />
          </label>
        )}
        <label className="flex-1">
          <span className="sr-only">{copy.emailPlaceholder}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            className={field}
          />
        </label>
        {/* Honeypot: hidden from people, filled by bots. */}
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-pill bg-primary px-6 py-3 text-[0.95rem] font-medium text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "sending" ? copy.sendingLabel : copy.buttonLabel}
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {copy.errorMessage}
        </p>
      )}
      {copy.privacyNote && <p className="mt-3 text-xs text-faint">{copy.privacyNote}</p>}
    </form>
  );
}
