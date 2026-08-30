import { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import WaitlistForm from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Individual Course — Compile",
  description:
    "Self-paced access to everything taught in Compile cohorts and school editions. Join the waitlist.",
};

export default function IndividualPage() {
  return (
    <>
      <Nav />

      <section className="mx-auto max-w-[1120px] px-8 py-24">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-[1fr_1fr]">
          <div>
            <span className="mb-5 inline-block rounded-[2px] border border-line px-2.5 py-[5px] font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
              Not open yet
            </span>
            <h1 className="mb-5 font-serif text-[48px] font-semibold leading-[1.08] tracking-[-0.02em] text-navy-deep">
              The self-paced course.<br />On its way.
            </h1>
            <p className="mb-4 text-[17px] text-muted">
              Everything taught across the cohort and school curriculum, built into one
              self-paced library — for builders who want the material without live access to
              an instructor.
            </p>
            <p className="mb-10 text-[15px] text-muted">
              We&apos;re building it properly before opening it. Leave your email and WhatsApp
              and you&apos;ll be the first to know when it&apos;s ready.
            </p>

            <WaitlistForm source="individual_course" />

            <p className="mt-5 text-[13px] text-muted">
              No spam. One message when it opens.{" "}
              <Link href="/" className="text-steel underline underline-offset-2">
                Back to home
              </Link>
            </p>
          </div>

          {/* Visual placeholder */}
          <div
            className="flex min-h-[380px] flex-col items-center justify-center rounded-[3px] border border-dashed border-line p-12 text-center"
            style={{
              background:
                "repeating-linear-gradient(135deg, transparent, transparent 11px, #EAEBE7 11px, #EAEBE7 12px)",
            }}
          >
            <div className="mb-4 font-serif text-[72px] font-semibold leading-none text-line">
              {"{ }"}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Nothing to show yet —<br />the material is still being<br />built, on purpose.
            </p>
          </div>
        </div>
      </section>

      {/* What to expect */}
      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-12 max-w-xl">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              What&apos;s coming
            </span>
            <h2 className="font-serif text-[30px] font-semibold text-navy-deep">
              The same material. Your pace.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
            {[
              {
                title: "Full curriculum",
                body: "Everything from JSS1 to SSS3 and the cohort syllabus — structured, sequenced, complete.",
              },
              {
                title: "No live access",
                body: "No cohort schedule to follow, no instructor sessions. You compile it at your own speed.",
              },
              {
                title: "One payment",
                body: "₦80,000, once. No subscription, no drip. Pay and own the whole library.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-surface px-8 py-10">
                <h3 className="mb-2.5 font-serif text-[19px] font-semibold text-navy-deep">
                  {item.title}
                </h3>
                <p className="text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
