"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  assessment: {
    id: string;
    status: string;
    deliveryMethod: string | null;
    questionCount: number;
    objQuestionCount: number;
  };
};

const DELIVERY_LABELS: Record<string, string> = {
  in_platform: "In-platform (MCQ on screen)",
  pdf: "PDF printout",
  csv: "CSV export",
};

export default function AssessmentControls({ assessment }: Props) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<string>(assessment.deliveryMethod ?? "in_platform");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canFinalize =
    assessment.status === "reviewed" &&
    assessment.questionCount >= assessment.objQuestionCount;

  const canMarkReviewed = assessment.status === "questions_generated";

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/school/assessments/${assessment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return false;
    }
    return true;
  }

  async function markReviewed() {
    const ok = await patch({ status: "reviewed" });
    if (ok) router.refresh();
  }

  async function finalize() {
    const ok = await patch({ status: "finalized", deliveryMethod: delivery });
    if (ok) router.refresh();
  }

  async function saveDelivery() {
    const ok = await patch({ deliveryMethod: delivery });
    if (ok) router.refresh();
  }

  if (assessment.status === "finalized") return null;

  return (
    <section className="rounded-[3px] border border-line bg-surface p-5 space-y-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-brass">Controls</h2>

      {/* Delivery method */}
      <div>
        <label className="mb-2 block font-mono text-xs text-muted">Delivery method</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(["in_platform", "pdf", "csv"] as const).map((d) => (
            <button
              key={d}
              type="button"
              disabled={loading}
              onClick={() => setDelivery(d)}
              className={`flex-1 rounded-[3px] border px-3 py-2 text-left text-sm transition-colors ${
                delivery === d
                  ? "border-navy bg-navy/5 text-navy-deep"
                  : "border-line bg-paper text-muted hover:border-navy"
              }`}
            >
              {DELIVERY_LABELS[d]}
            </button>
          ))}
        </div>
        {assessment.deliveryMethod !== delivery && (
          <button
            type="button"
            disabled={loading}
            onClick={saveDelivery}
            className="mt-2 font-mono text-xs text-steel hover:underline disabled:opacity-50"
          >
            Save delivery method
          </button>
        )}
      </div>

      {/* Question count warning */}
      {assessment.questionCount < assessment.objQuestionCount && (
        <p className="font-mono text-xs text-brass">
          {assessment.questionCount}/{assessment.objQuestionCount} questions present — add more before finalizing.
        </p>
      )}

      {error && (
        <p className="font-mono text-xs text-[#991B1B]">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {canMarkReviewed && (
          <button
            type="button"
            disabled={loading}
            onClick={markReviewed}
            className="rounded-[3px] border border-navy px-4 py-2 font-mono text-xs text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Mark as reviewed →"}
          </button>
        )}
        {canFinalize && (
          <button
            type="button"
            disabled={loading}
            onClick={finalize}
            className="rounded-[3px] bg-navy px-4 py-2 font-mono text-xs text-surface hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Finalizing…" : "Finalize assessment →"}
          </button>
        )}
        {assessment.status === "draft" && (
          <p className="font-mono text-xs text-muted">
            Questions are being generated — refresh in a moment.
          </p>
        )}
      </div>
    </section>
  );
}
