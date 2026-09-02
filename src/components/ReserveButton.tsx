"use client";

import { useRef, useState } from "react";

const BANK_NAME = "Moniepoint MFB";
const ACCOUNT_NUMBER = "6753109871";
const ACCOUNT_NAME = "Mount LTD";
const RECEIPT_WHATSAPP = "2348139672432";

type Status = "idle" | "earlyBirdEnded" | "open" | "submitting" | "details" | "full";

interface Props {
  seatsLeft: number;
  label: string;
  variant?: "primary" | "secondary";
  isEarlyBird?: boolean;
}

export default function ReserveButton({
  seatsLeft,
  label,
  variant = "primary",
  isEarlyBird = true,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [amountNaira, setAmountNaira] = useState(50_000);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const waRef = useRef<HTMLInputElement>(null);

  const isPrimary = variant === "primary";

  if (seatsLeft <= 0) {
    return (
      <div className="block w-full rounded-[2px] border border-line py-[11px] text-center text-sm font-medium text-muted">
        Cohort is full
      </div>
    );
  }

  if (status === "full") {
    return (
      <div className="rounded-[2px] border border-line bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
        The last seat was taken while you were checking out. Reach out at compile100@gmail.com and we&apos;ll sort it out.
      </div>
    );
  }

  if (status === "earlyBirdEnded") {
    return (
      <div className="space-y-3">
        <div className="rounded-[2px] border border-line bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          <strong className="font-semibold">Early bird pricing has ended.</strong> The September 10 deadline has passed. You can still reserve your spot at the regular price of ₦70,000.
        </div>
        <button
          onClick={() => setStatus("open")}
          className="block w-full rounded-[2px] bg-navy py-[11px] text-center text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          Reserve at ₦70,000 →
        </button>
        <button
          onClick={() => setStatus("idle")}
          className="w-full text-center text-xs text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button
        onClick={() => {
          if (variant === "primary" && !isEarlyBird) {
            setStatus("earlyBirdEnded");
          } else {
            setStatus("open");
          }
        }}
        className={
          isPrimary
            ? "block w-full rounded-[2px] bg-navy py-[11px] text-center text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            : "block w-full rounded-[2px] border border-line py-[11px] text-center text-sm font-medium text-ink transition-colors hover:border-navy-deep hover:text-navy-deep"
        }
      >
        {label}
      </button>
    );
  }

  if (status === "details") {
    const name = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const msg = encodeURIComponent(
      `Hi! I've made payment for Compile Cohort 01.\n\nName: ${name}\nEmail: ${email}\n\nAttaching my receipt now.`
    );
    const waUrl = `https://wa.me/${RECEIPT_WHATSAPP}?text=${msg}`;

    return (
      <div className="space-y-4">
        <div className="rounded-[2px] border border-line bg-surface p-5">
          <p className="mb-4 text-sm font-semibold text-navy-deep">
            Transfer ₦{amountNaira.toLocaleString()} to:
          </p>
          <div className="space-y-3">
            {[
              { label: "Bank", value: BANK_NAME },
              { label: "Account number", value: ACCOUNT_NUMBER },
              { label: "Account name", value: ACCOUNT_NAME },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0">
                <span className="font-mono text-xs text-muted">{row.label}</span>
                <span className="text-sm font-semibold text-navy-deep">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted">
          Once you&apos;ve sent the transfer, tap the button below to send your receipt via WhatsApp. Your spot is confirmed after we verify it — usually within a few hours.
        </p>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-[2px] bg-navy py-[11px] text-center text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          I have paid — send receipt →
        </a>

        <button
          onClick={() => setStatus("open")}
          className="w-full text-center text-xs text-muted hover:text-ink"
        >
          Go back
        </button>
      </div>
    );
  }

  // status === "open" | "submitting"
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fullName = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const whatsapp = waRef.current?.value.trim() || undefined;

    if (!fullName || !email) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, whatsapp }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.full) {
          setStatus("full");
          return;
        }
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("open");
        return;
      }

      setAmountNaira(data.amountNaira ?? 50_000);
      setStatus("details");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("open");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input
        ref={nameRef}
        type="text"
        placeholder="Full name"
        required
        minLength={2}
        disabled={status === "submitting"}
        className="w-full rounded-[2px] border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
      />
      <input
        ref={emailRef}
        type="email"
        placeholder="Email address"
        required
        disabled={status === "submitting"}
        className="w-full rounded-[2px] border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
      />
      <input
        ref={waRef}
        type="tel"
        placeholder="WhatsApp number (optional)"
        disabled={status === "submitting"}
        className="w-full rounded-[2px] border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
      />

      {errorMsg && (
        <p className="rounded-[2px] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="block w-full rounded-[2px] bg-navy py-[11px] text-center text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {status === "submitting" ? "Checking availability…" : "See payment details →"}
      </button>

      <button
        type="button"
        onClick={() => {
          setStatus("idle");
          setErrorMsg("");
        }}
        className="w-full text-center text-xs text-muted hover:text-ink"
      >
        Cancel
      </button>
    </form>
  );
}
