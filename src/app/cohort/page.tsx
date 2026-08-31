import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import WaitlistForm from "@/components/WaitlistForm";

export const metadata = {
  title: "Cohort 01: Web & Platforms — Compile",
  description:
    "A 10-week live cohort where you build real web apps, websites, and platforms — with an instructor correcting your work in real time.",
};

export default function CohortPage() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="mx-auto max-w-[1120px] px-6 py-14 md:px-8 md:py-24">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
          <div>
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-[2px] border border-navy px-3 py-1.5">
              <span className="rounded-[1px] bg-navy px-1.5 py-0.5 font-mono text-[11px] text-white">
                01
              </span>
              <span className="font-mono text-[11px] tracking-[0.06em] text-navy-deep uppercase">
                Web & Platforms Cohort
              </span>
            </div>
            <h1 className="mb-5 font-serif text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-navy-deep md:text-[52px] md:leading-[1.06]">
              Stop learning to code.<br />Start{" "}
              <em className="not-italic text-steel">shipping</em> it.
            </h1>
            <p className="mb-8 max-w-[480px] text-[17px] text-muted">
              A 10-week live cohort where you build real web apps, websites, and platforms — with
              an instructor correcting your work in real time, not a pre-recorded course you&apos;ll
              abandon by week two.
            </p>
            <div className="flex items-center gap-3.5">
              <Link
                href="#pricing"
                className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
              >
                Reserve your seat
              </Link>
              <Link
                href="#program"
                className="rounded-[2px] border border-line px-[18px] py-[11px] text-sm font-medium text-ink"
              >
                See the program
              </Link>
            </div>
            <div className="mt-11 flex gap-7 font-mono text-xs tracking-wide text-muted">
              <div>
                <strong className="mb-0.5 block font-sans text-sm font-bold text-navy-deep">Oct 3</strong>
                Cohort starts
              </div>
              <div>
                <strong className="mb-0.5 block font-sans text-sm font-bold text-navy-deep">10</strong>
                Seats, no more
              </div>
              <div>
                <strong className="mb-0.5 block font-sans text-sm font-bold text-navy-deep">10 wks</strong>
                2 live sessions/wk
              </div>
            </div>
          </div>

          {/* Code card visual */}
          <div className="overflow-hidden rounded-[3px] border border-line bg-surface shadow-[0_20px_50px_-20px_rgba(18,21,27,0.15)]">
            <div className="flex gap-1.5 bg-navy-deep px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-white/25" />
              <span className="h-2 w-2 rounded-full bg-white/25" />
              <span className="h-2 w-2 rounded-full bg-white/25" />
            </div>
            <div className="p-6 font-mono text-[13px] leading-[1.7]">
              <div className="text-muted">{"{"}</div>
              <div className="text-muted">
                &nbsp;&nbsp;<span className="text-steel">&quot;builder&quot;</span>:{" "}
                <span className="text-brass">&quot;you&quot;</span>,
              </div>
              <div className="text-muted">
                &nbsp;&nbsp;<span className="text-steel">&quot;cohort&quot;</span>:{" "}
                <span className="text-brass">&quot;01 — web-platforms&quot;</span>,
              </div>
              <div className="text-muted">
                &nbsp;&nbsp;<span className="text-steel">&quot;status&quot;</span>:{" "}
                <span className="text-brass">&quot;building live&quot;</span>,
              </div>
              <div className="text-muted">
                &nbsp;&nbsp;<span className="text-steel">&quot;seats_left&quot;</span>:{" "}
                <span className="text-brass">4</span>
              </div>
              <div className="text-muted">{"}"}</div>
              <div className="mt-4 flex justify-between border-t border-line pt-4 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4C8B5F]" />
                  Applications open
                </span>
                <span>Early bird ends Sep 10</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU BUILD */}
      <section className="py-[88px]" id="program">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-14">
            <span className="mb-3.5 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              What this cohort builds
            </span>
            <h2 className="mb-3.5 font-serif text-[34px] font-semibold text-navy-deep">
              Web, websites, and full platforms.
            </h2>
            <p className="text-base text-muted">
              Cohort 01 focuses on one category of software end to end. Future cohorts will run the
              same live format for mobile apps, games, and AI — this one is web.
            </p>
          </div>

          <div className="grid grid-cols-1 border border-line md:grid-cols-3" style={{ gap: "1px", background: "var(--color-line)" }}>
            {[
              {
                idx: "01",
                title: "Websites",
                body: "From a single landing page to a full multi-page site — structure, content, and a design that doesn't look templated.",
              },
              {
                idx: "02",
                title: "Web Apps",
                body: "Interactive products with real logic — accounts, data, and the kind of functionality people actually use daily.",
              },
              {
                idx: "03",
                title: "Platforms",
                body: "Multi-sided systems — think a business management tool with dashboards, roles, and real operational data underneath.",
              },
            ].map((item) => (
              <div key={item.idx} className="bg-surface p-9">
                <div className="mb-4.5 font-mono text-xs tracking-wide text-brass">{item.idx}</div>
                <h3 className="mb-2.5 font-serif text-[19px] font-semibold text-navy-deep">
                  {item.title}
                </h3>
                <p className="text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAM STRUCTURE */}
      <section className="bg-navy-deep py-[88px]">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-14">
            <span className="mb-3.5 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Program structure
            </span>
            <h2 className="mb-3.5 font-serif text-[34px] font-semibold text-white">
              How the 10 weeks run
            </h2>
            <p className="text-base text-white/60">
              No pre-recorded drip-feed. Every session is live, and a handful of cohort members
              build on-screen each week for the group to watch and get corrected in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              {
                wk: "Wk 1–2",
                title: "Foundations, fast",
                body: "Get everyone building with AI-assisted tools from day one — no dead weeks of theory.",
              },
              {
                wk: "Wk 3–5",
                title: "Build in public",
                body: "Live build-and-correct sessions — members build on screen, the group and instructor review it together.",
              },
              {
                wk: "Wk 6–8",
                title: "Ship the real thing",
                body: "Move from exercises to your actual project — a site, app, or platform you'll walk away owning.",
              },
              {
                wk: "Wk 9–10",
                title: "Demo & close",
                body: "Present what you built. Leave the cohort with a shipped product, not just a certificate.",
              },
            ].map((item) => (
              <div
                key={item.wk}
                className="rounded-[2px] border border-white/[0.14] p-5.5"
              >
                <div className="mb-2.5 font-mono text-[11px] tracking-wide text-brass">{item.wk}</div>
                <h4 className="mb-1.5 text-[15px] font-semibold text-white">{item.title}</h4>
                <p className="text-[13px] text-white/60">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3.5 border border-dashed border-white/25 p-[18px] text-sm text-white/85">
            <span className="shrink-0 font-mono text-xs tracking-widest text-brass uppercase">Cap: 10</span>
            <span>Kept small on purpose — every member gets seen and corrected, not lost in a crowd.</span>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-[88px]" id="pricing">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-14">
            <span className="mb-3.5 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Cohort 01 pricing
            </span>
            <h2 className="mb-3.5 font-serif text-[34px] font-semibold text-navy-deep">
              One price. It goes up September 10.
            </h2>
            <p className="text-base text-muted">
              Same cohort, same seats — the only thing that changes is what you pay to reserve one.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Early bird */}
            <div className="relative rounded-[3px] border border-navy bg-surface p-9 shadow-[0_12px_32px_-16px_rgba(27,53,94,0.25)]">
              <span className="absolute -top-[11px] left-8 rounded-[2px] bg-brass px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] text-navy-deep uppercase">
                Early bird
              </span>
              <div className="mb-1.5 font-mono text-xs tracking-wide text-muted">Before Sep 10, 2026</div>
              <div className="mb-1 font-serif text-[44px] font-semibold text-navy-deep">
                ₦50,000
              </div>
              <ul className="my-6 space-y-0 text-sm text-muted">
                {[
                  "Full 10-week live cohort",
                  "2 live sessions every week",
                  "Build-and-correct sessions",
                  "Recorded for your own review",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5 border-t border-line py-2 first:border-0">
                    <span className="shrink-0 text-brass">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="block w-full rounded-[2px] bg-navy py-[11px] text-sm font-semibold text-white text-center transition-colors hover:bg-navy-deep">
                Reserve at ₦50,000
              </button>
            </div>

            {/* Regular */}
            <div className="rounded-[3px] border border-line bg-surface p-9">
              <div className="mb-1.5 font-mono text-xs tracking-wide text-muted">From Sep 11, 2026</div>
              <div className="mb-1 font-serif text-[44px] font-semibold text-navy-deep">
                ₦70,000
              </div>
              <ul className="my-6 space-y-0 text-sm text-muted">
                {[
                  "Full 10-week live cohort",
                  "2 live sessions every week",
                  "Build-and-correct sessions",
                  "Recorded for your own review",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5 border-t border-line py-2 first:border-0">
                    <span className="shrink-0 text-brass">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="block w-full rounded-[2px] border border-line py-[11px] text-sm font-medium text-ink text-center">
                Reserve at ₦70,000
              </button>
            </div>
          </div>
          <p className="mt-5 text-center font-mono text-[11px] tracking-wide text-muted">
            Only 10 seats per cohort — regardless of when you apply.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-line pt-8 text-center">
            <p className="text-sm text-muted">Have questions before you commit? Reach us directly on WhatsApp.</p>
            <a
              href="https://wa.me/23481397672432"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-[2px] border border-line bg-surface px-5 py-[11px] text-sm font-semibold text-ink transition-colors hover:border-navy hover:text-navy-deep"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* INDIVIDUAL — COMING SOON */}
      <section className="border-y border-line bg-surface" id="individual">
        <div className="mx-auto max-w-[1120px] px-8 py-[88px]">
          <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="mb-4.5 inline-block rounded-[2px] border border-line px-2.5 py-[5px] font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                Starting soon
              </span>
              <h2 className="mb-3.5 font-serif text-[30px] font-semibold text-navy-deep">
                The self-paced course isn&apos;t open yet.
              </h2>
              <p className="mb-6 max-w-[440px] text-[15px] text-muted">
                Everything taught across the cohort and the school curriculum, packed into one
                self-paced library — for builders who want the material without live access to an
                instructor. We&apos;re loading it properly before it opens, not rushing it out.
              </p>
              <WaitlistForm source="individual_course" compact />
            </div>

            <div
              className="relative flex min-h-[280px] flex-col items-center justify-center rounded-[3px] border border-dashed border-line p-10 text-center"
              style={{
                background:
                  "repeating-linear-gradient(135deg, transparent, transparent 11px, #EAEBE7 11px, #EAEBE7 12px)",
              }}
            >
              <Image
                src="/images/compile-icon-navy.svg"
                alt=""
                width={100}
                height={110}
                className="mb-5 h-24 w-auto opacity-10"
                aria-hidden="true"
              />
              <p className="font-mono text-xs tracking-wide text-muted" style={{ maxWidth: 260 }}>
                NOTHING TO SHOW YET — THE MATERIAL IS STILL BEING BUILT, ON PURPOSE.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
