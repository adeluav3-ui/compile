import Link from "next/link";
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
      <CohortNav />

      {/* HERO */}
      <section className="mx-auto max-w-[1120px] px-8 py-24">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-[2px] border border-navy px-3 py-1.5">
              <span className="rounded-[1px] bg-navy px-1.5 py-0.5 font-mono text-[11px] text-white">
                01
              </span>
              <span className="font-mono text-[11px] tracking-[0.06em] text-navy-deep uppercase">
                Web & Platforms Cohort
              </span>
            </div>
            <h1 className="mb-5 font-serif text-[52px] font-semibold leading-[1.06] tracking-[-0.02em] text-navy-deep">
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

          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
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
              <span className="absolute -top-[11px] left-8 rounded-[2px] bg-brass px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-navy-deep uppercase">
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
              className="flex min-h-[280px] flex-col items-center justify-center rounded-[3px] border border-dashed border-line p-10 text-center"
              style={{
                background:
                  "repeating-linear-gradient(135deg, transparent, transparent 11px, #EAEBE7 11px, #EAEBE7 12px)",
              }}
            >
              <div className="mb-3 font-serif text-[64px] font-semibold text-line">{"{ }"}</div>
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

function CohortNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex h-[76px] max-w-[1120px] items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-navy-deep">
          <span className="inline-block h-2.5 w-2.5 rounded-[1px] bg-brass" />
          Compile
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          <Link href="#program" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Cohort 01
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Pricing
          </Link>
          <Link href="#individual" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Individual Course
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-medium text-[#B5B9BE]">
            For Schools
            <span className="font-mono rounded-[2px] bg-line px-1.5 py-0.5 text-[10px] tracking-wider text-muted">
              Soon
            </span>
          </span>
        </nav>

        <Link
          href="#pricing"
          className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          Apply now
        </Link>
      </div>
    </header>
  );
}
