"use client";

import { useState } from "react";

type Source = "individual_course" | "school_edition";

interface Props {
  source: Source;
  compact?: boolean; // inline single-row variant used in cards
}

export default function WaitlistForm({ source, compact = false }: Props) {
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, whatsapp: whatsapp || null, source }),
    });

    if (res.ok) {
      setState("done");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-[2px] border border-line bg-[#E4EEE6] px-5 py-4">
        <p className="text-sm font-medium text-[#2E6E45]">
          You&apos;re on the list. We&apos;ll message you on WhatsApp (or email) when it opens.
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex max-w-[380px] flex-col gap-2.5">
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-[2px] border border-line bg-paper px-3.5 py-[11px] font-sans text-sm outline-none focus:border-navy"
        />
        <input
          type="tel"
          placeholder="WhatsApp number (e.g. +2348012345678)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="rounded-[2px] border border-line bg-paper px-3.5 py-[11px] font-sans text-sm outline-none focus:border-navy"
        />
        {state === "error" && (
          <p className="text-[13px] text-red-600">{errorMsg}</p>
        )}
        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
        >
          {state === "loading" ? "Adding you…" : "Notify me"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-[420px] flex-col gap-3">
      <div>
        <label className="mb-1.5 block font-mono text-[11px] tracking-widest text-muted uppercase">
          Email
        </label>
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[2px] border border-line bg-paper px-3.5 py-3 text-sm outline-none focus:border-navy"
        />
      </div>
      <div>
        <label className="mb-1.5 block font-mono text-[11px] tracking-widest text-muted uppercase">
          WhatsApp number{" "}
          <span className="normal-case tracking-normal text-muted/60">(optional)</span>
        </label>
        <input
          type="tel"
          placeholder="+2348012345678"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="w-full rounded-[2px] border border-line bg-paper px-3.5 py-3 text-sm outline-none focus:border-navy"
        />
      </div>
      {state === "error" && (
        <p className="text-[13px] text-red-600">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        className="rounded-[2px] bg-navy py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {state === "loading" ? "Adding you to the list…" : "Join the waitlist"}
      </button>
    </form>
  );
}
