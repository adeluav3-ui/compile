import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compile for Schools — Compile",
  description:
    "A full JSS1–SSS3 coding curriculum for Nigerian secondary schools. Lesson videos, live-graded practical exams, and dashboards — built to run even when your school's internet doesn't.",
};

export default function SchoolPage() {
  return (
    <>
      <SchoolNav />

      {/* HERO */}
      <section className="py-[88px] pb-[72px] text-center">
        <div className="mx-auto max-w-[1120px] px-8">
          <span className="mb-5 block font-mono text-xs tracking-[0.1em] text-brass uppercase">
            Compile for Schools
          </span>
          <h1 className="mx-auto mb-[22px] max-w-[760px] font-serif text-[48px] font-semibold leading-[1.1] tracking-[-0.01em] text-navy-deep">
            Every student leaves knowing how to build. Not just how to answer questions about it.
          </h1>
          <p className="mx-auto mb-8 max-w-[540px] text-[17px] text-muted">
            A full JSS1–SSS3 coding curriculum with lesson videos, live-graded practical exams,
            and dashboards for admins, teachers, and students — built to run even when your
            school&apos;s internet doesn&apos;t.
          </p>
          <div className="mb-14 flex justify-center gap-3.5">
            <Link
              href="#pricing"
              className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              Book a demo for your school
            </Link>
            <Link
              href="#outcomes"
              className="rounded-[2px] border border-line px-[18px] py-[11px] text-sm font-medium text-ink"
            >
              See the outcomes
            </Link>
          </div>

          {/* Stat row */}
          <div
            className="mx-auto grid max-w-[820px] grid-cols-3 gap-px bg-line"
            style={{ border: "1px solid var(--color-line)" }}
          >
            {[
              { num: "JSS1–SSS3", label: "Full curriculum, one platform" },
              { num: "Offline", label: "Runs on your school's local network" },
              { num: "₦150k", label: "Flat monthly, per school" },
            ].map((s) => (
              <div key={s.num} className="bg-surface px-5 py-7 text-center">
                <div className="mb-1 font-serif text-[32px] font-bold text-navy-deep">{s.num}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="py-[88px]" id="outcomes">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mx-auto mb-12 max-w-[600px] text-center">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              What students actually leave with
            </span>
            <h2 className="font-serif text-[32px] font-semibold text-navy-deep">
              Two real outcomes, not a certificate.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[3px] border border-line bg-surface p-8">
              <div className="mb-3.5 font-mono text-[11px] text-brass">By end of JSS3</div>
              <h3 className="mb-2.5 font-serif text-[22px] font-semibold text-navy-deep">
                Every student can build a standard website
              </h3>
              <p className="text-sm text-muted">
                Structure, content, and a working site — not a memorized definition of what HTML is.
              </p>
            </div>
            <div className="rounded-[3px] border border-line bg-surface p-8">
              <div className="mb-3.5 font-mono text-[11px] text-brass">By end of SSS3</div>
              <h3 className="mb-2.5 font-serif text-[22px] font-semibold text-navy-deep">
                Every student can build a standard app
              </h3>
              <p className="text-sm text-muted">
                Real functionality — accounts, data, logic — building on everything from JSS1–JSS3.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-navy-deep py-[88px]" id="features">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mx-auto mb-12 max-w-[600px] text-center">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Built for how Nigerian schools actually run
            </span>
            <h2 className="mb-3 font-serif text-[32px] font-semibold text-white">
              Not a platform that assumes perfect internet.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px bg-white/[0.12] md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Works offline",
                body: "Lessons and videos run from your school's own local network — no dependence on classroom internet.",
              },
              {
                n: "02",
                title: "AI-assisted marking",
                body: "Practical exams get an AI first pass; teachers confirm or adjust — grading time drops without losing teacher oversight.",
              },
              {
                n: "03",
                title: "Results feed report cards",
                body: "Every term's practical exam results are exportable and ready to drop straight into existing report cards.",
              },
              {
                n: "04",
                title: "Three dashboards",
                body: "Admins see the whole school. Teachers see their classes. Students see their own progress. Nobody's guessing.",
              },
              {
                n: "05",
                title: "Per-class syllabus",
                body: "Spread the curriculum across years your way, or run every class through it together on one intensive track.",
              },
              {
                n: "06",
                title: "Built-in AI tutor",
                body: "Students can ask questions as they work — queued and answered even if it catches your school between connections.",
              },
            ].map((f) => (
              <div key={f.n} className="bg-navy-deep p-8 pb-9 pl-[26px] pr-[26px] pt-8">
                <div className="mb-[18px] flex h-8 w-8 items-center justify-center rounded-[2px] border border-brass font-mono text-[13px] text-brass">
                  {f.n}
                </div>
                <h3 className="mb-2 font-sans text-[17px] font-semibold text-white">{f.title}</h3>
                <p className="text-[13px] leading-[1.7] text-white/60">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-[88px]" id="pricing">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mx-auto mb-12 max-w-[600px] text-center">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Pricing
            </span>
            <h2 className="font-serif text-[32px] font-semibold text-navy-deep">
              One flat price. Every student, every dashboard.
            </h2>
          </div>

          <div className="mx-auto max-w-[520px] rounded-[3px] border border-navy bg-surface p-10 text-center shadow-[0_16px_40px_-18px_rgba(27,53,94,0.25)]">
            <div className="font-serif text-[44px] font-bold text-navy-deep">
              ₦150,000<span className="font-sans text-[15px] font-medium text-muted">/month per school</span>
            </div>
            <ul className="my-[26px] mb-[30px] text-left text-sm text-muted">
              {[
                "Full JSS1–SSS3 curriculum",
                "Admin, teacher, and student dashboards",
                "AI-assisted marking and student Q&A",
                "Offline access via your school's local network",
                "Termly practical exams with exportable results",
              ].map((item, i) => (
                <li key={i} className="flex gap-2.5 border-t border-line py-[9px] first:border-0">
                  <span className="shrink-0 text-brass">—</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="mailto:hello@compile.ng"
              className="block w-full rounded-[2px] bg-navy py-[11px] text-center text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              Book a demo for your school
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line py-12 text-center">
        <p className="text-[13px] text-muted">
          Compile for Schools — part of the Compile coding education platform.
        </p>
      </footer>
    </>
  );
}

function SchoolNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex h-[76px] max-w-[1120px] items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-navy-deep">
          <span className="inline-block h-2.5 w-2.5 rounded-[1px] bg-brass" />
          Compile
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#outcomes" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Outcomes
          </Link>
          <Link href="#features" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            How it works
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Pricing
          </Link>
        </nav>

        <Link
          href="#pricing"
          className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          Book a demo
        </Link>
      </div>
    </header>
  );
}
