import { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Help & Support — Compile",
  description:
    "Payment issues, refund requests, program questions — reach the Compile team directly.",
};

const faqs = [
  {
    q: "I paid but wasn't taken to the WhatsApp group.",
    a: "The redirect happens immediately after payment confirms. If it didn't work — tab closed too early, browser blocked the redirect, anything — email us at compile100@gmail.com with the email you used and your payment reference. We'll get you in manually.",
  },
  {
    q: "I want a refund.",
    a: "Email compile100@gmail.com with your full name, payment email, and Paystack reference number. We process refund requests within 5 business days.",
  },
  {
    q: "My payment went through but something feels wrong.",
    a: "Don't re-pay. Reach out on WhatsApp or email with your reference and we'll look it up and sort it out.",
  },
  {
    q: "When does Cohort 01 start?",
    a: "October 3, 2026. Two live sessions per week for 10 weeks. You'll get full schedule details through the WhatsApp group after reserving your spot.",
  },
  {
    q: "How many seats are left?",
    a: "The cohort is capped at 10 seats. The live count is shown on the cohort page — if seats are showing, they're available.",
  },
  {
    q: "I have a question about the program before I pay.",
    a: "Reach us on WhatsApp — happy to answer anything before you commit.",
  },
  {
    q: "I joined the waitlist for the individual course. What happens next?",
    a: "You'll get one message when the individual course opens — no spam in between. That's the deal.",
  },
];

export default function SupportPage() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="py-14 text-center md:py-20">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8">
          <span className="mb-4 block font-mono text-xs tracking-[0.1em] text-brass uppercase">
            Help & Support
          </span>
          <h1 className="mx-auto mb-5 max-w-[680px] font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.01em] text-navy-deep md:text-[46px]">
            Got an issue? We&apos;re reachable.
          </h1>
          <p className="mx-auto max-w-[480px] text-[17px] text-muted">
            Payment problems, refund requests, access issues, program questions — reach
            us directly and we&apos;ll sort it out.
          </p>
        </div>
      </section>

      {/* CONTACT METHODS */}
      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8">
          <div className="mb-10">
            <span className="mb-2 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Reach us
            </span>
            <h2 className="font-serif text-[28px] font-semibold text-navy-deep">
              Two ways to contact us
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* WhatsApp */}
            <div className="flex flex-col rounded-[3px] border border-line bg-surface p-8">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[2px] bg-[#E7F8EE]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-[20px] font-semibold text-navy-deep">
                WhatsApp
              </h3>
              <p className="mb-6 grow text-sm text-muted">
                Fastest for urgent issues — payment problems, access, anything that
                needs a quick answer. Reach us directly.
              </p>
              <a
                href="https://wa.me/2348139672432"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy-deep"
              >
                Chat on WhatsApp →
              </a>
              <p className="mt-2 text-xs text-muted">Typically replies within a few hours</p>
            </div>

            {/* Email */}
            <div className="flex flex-col rounded-[3px] border border-line bg-surface p-8">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[2px] bg-[#EEF2FF]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3E6FB0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-[20px] font-semibold text-navy-deep">
                Email
              </h3>
              <p className="mb-6 grow text-sm text-muted">
                For formal complaints, refund requests, or anything that needs a written
                record. Include your payment reference if it&apos;s transaction-related.
              </p>
              <a
                href="mailto:compile100@gmail.com"
                className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy-deep"
              >
                compile100@gmail.com →
              </a>
              <p className="mt-2 text-xs text-muted">We reply within 1 business day</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8">
          <div className="mb-10">
            <span className="mb-2 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Common questions
            </span>
            <h2 className="font-serif text-[28px] font-semibold text-navy-deep">
              Answers before you reach out
            </h2>
          </div>

          <div className="max-w-[760px]">
            {faqs.map((item, i) => (
              <div key={i} className="border-t border-line py-6 first:border-0">
                <h3 className="mb-2.5 text-[15px] font-semibold text-navy-deep">
                  {item.q}
                </h3>
                <p className="text-sm leading-[1.75] text-muted">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-[760px] rounded-[3px] border border-dashed border-line bg-surface px-8 py-7">
            <p className="text-sm text-muted">
              <strong className="font-semibold text-ink">Didn&apos;t find what you need?</strong>{" "}
              Reach out on{" "}
              <a
                href="https://wa.me/2348139672432"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-navy underline underline-offset-2"
              >
                WhatsApp
              </a>{" "}
              or email{" "}
              <a
                href="mailto:compile100@gmail.com"
                className="font-medium text-navy underline underline-offset-2"
              >
                compile100@gmail.com
              </a>{" "}
              — we&apos;ll get back to you.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
