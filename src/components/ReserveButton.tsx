"use client";

import { useRef, useState } from "react";

declare global {
  interface Window {
    PaystackPop: {
      setup(opts: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        currency?: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }): { openIframe(): void };
    };
  }
}

type Status =
  | "idle"
  | "open"
  | "submitting"
  | "paying"
  | "verifying"
  | "redirecting"
  | "full";

interface Props {
  seatsLeft: number;
  label: string;
  variant?: "primary" | "secondary";
}

export default function ReserveButton({
  seatsLeft,
  label,
  variant = "primary",
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const statusRef = useRef<Status>("idle");

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const waRef = useRef<HTMLInputElement>(null);

  function updateStatus(s: Status) {
    setStatus(s);
    statusRef.current = s;
  }

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
        The last seat was taken while you were checking out. We&apos;ll reach
        out within 24 hours to arrange a full refund.
      </div>
    );
  }

  if (status === "redirecting" || status === "verifying") {
    return (
      <div className="flex items-center justify-center gap-2 py-[11px] text-sm text-muted">
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-navy" />
        {status === "verifying" ? "Confirming your payment…" : "Joining the group…"}
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button
        onClick={() => updateStatus("open")}
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

  // status === "open" | "submitting" | "paying"
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fullName = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const whatsapp = waRef.current?.value.trim() || undefined;

    if (!fullName || !email) return;

    updateStatus("submitting");
    setErrorMsg("");

    let reference: string;
    let amountKobo: number;
    let paystackKey: string;

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, whatsapp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        updateStatus("open");
        return;
      }

      reference = data.reference;
      amountKobo = data.amountKobo;
      paystackKey = data.paystackKey ?? "";
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      updateStatus("open");
      return;
    }

    if (!paystackKey) {
      setErrorMsg("Payment is not configured yet. Contact hello@compile.ng.");
      updateStatus("open");
      return;
    }

    updateStatus("paying");

    // Paystack's v1 inline.js validates callback with Object.prototype.toString,
    // which returns [object AsyncFunction] for async arrows — failing its check.
    // Wrap the async work in a plain sync function to pass validation.
    function onPaymentComplete(response: { reference: string }) {
      updateStatus("verifying");

      fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: response.reference }),
      })
        .then((vRes) => vRes.json())
        .then((vData) => {
          if (vData.ok && vData.redirectUrl) {
            updateStatus("redirecting");
            window.location.href = vData.redirectUrl;
          } else if (vData.full) {
            updateStatus("full");
          } else {
            setErrorMsg(
              vData.error ??
                "Payment could not be confirmed. Contact hello@compile.ng with your payment reference."
            );
            updateStatus("open");
          }
        })
        .catch(() => {
          setErrorMsg(
            "Network error during confirmation. Contact hello@compile.ng with your payment reference."
          );
          updateStatus("open");
        });
    }

    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email,
      amount: Math.round(Number(amountKobo)), // guard: must be plain integer kobo
      ref: reference,
      currency: "NGN",
      callback: onPaymentComplete,
      onClose: () => {
        if (statusRef.current === "paying") {
          updateStatus("open");
        }
      },
    });

    handler.openIframe();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input
        ref={nameRef}
        type="text"
        placeholder="Full name"
        required
        minLength={2}
        disabled={status === "submitting" || status === "paying"}
        className="w-full rounded-[2px] border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
      />
      <input
        ref={emailRef}
        type="email"
        placeholder="Email address"
        required
        disabled={status === "submitting" || status === "paying"}
        className="w-full rounded-[2px] border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
      />
      <input
        ref={waRef}
        type="tel"
        placeholder="WhatsApp number (optional)"
        disabled={status === "submitting" || status === "paying"}
        className="w-full rounded-[2px] border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
      />

      {errorMsg && (
        <p className="rounded-[2px] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || status === "paying"}
        className="block w-full rounded-[2px] bg-navy py-[11px] text-center text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {status === "submitting"
          ? "Checking availability…"
          : status === "paying"
            ? "Complete payment in Paystack window…"
            : "Continue to payment →"}
      </button>

      <button
        type="button"
        onClick={() => {
          updateStatus("idle");
          setErrorMsg("");
        }}
        className="w-full text-center text-xs text-muted hover:text-ink"
      >
        Cancel
      </button>
    </form>
  );
}
