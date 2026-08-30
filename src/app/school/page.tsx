import Link from "next/link";
import { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Compile for Schools — Compile",
  description:
    "A full JSS1–SSS3 coding curriculum for Nigerian secondary schools. Video lessons, AI-assisted marking, and three dashboards — works offline on your school's network.",
};

export default function SchoolPage() {
  return (
    <>
      <SchoolNav />

      {/* HERO */}
      <section className="bg-navy-deep py-[100px] text-white">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mx-auto max-w-[680px] text-center">
            <span className="mb-5 block font-mono text-xs tracking-[0.1em] text-brass uppercase">
              Compile for Schools
            </span>
            <h1 className="mb-6 font-serif text-[52px] font-semibold leading-[1.07] tracking-[-0.02em] text-white">
              A coding curriculum your school can actually run.
            </h1>
            <p className="mb-9 text-[17px] leading-[1.6] text-white/65">
              Full JSS1–SSS3 coverage. Lessons, practice questions, and practical exams — with
              dashboards for students, teachers, and your admin. Works on your school&apos;s
              local network even without internet.
            </p>
            <div className="flex flex-wrap justify-center gap-3.5">
              <Link
                href="#pricing"
                className="rounded-[2px] bg-brass px-6 py-[11px] text-sm font-semibold text-navy-deep transition-opacity hover:opacity-90"
              >
                Book a demo for your school
              </Link>
              <Link
                href="#outcomes"
                className="rounded-[2px] border border-white/25 px-6 py-[11px] text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
              >
                See the outcomes
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-10 font-mono text-xs text-white/45">
              <div>
                <strong className="mb-1 block font-sans text-base font-bold text-white">JSS1–SSS3</strong>
                Full curriculum coverage
              </div>
              <div>
                <strong className="mb-1 block font-sans text-base font-bold text-white">Offline</strong>
                Works without internet
              </div>
              <div>
                <strong className="mb-1 block font-sans text-base font-bold text-white">₦150k</strong>
                Per school, per month
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="py-[88px]" id="outcomes">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-14 text-center">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              What students leave with
            </span>
            <h2 className="font-serif text-[34px] font-semibold text-navy-deep">
              Real outcomes. Not just a syllabus completed.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[3px] border border-line bg-surface p-10">
              <div className="mb-4 font-mono text-[11px] tracking-widest text-brass uppercase">
                By end of JSS3
              </div>
              <h3 className="mb-3 font-serif text-[26px] font-semibold leading-[1.2] text-navy-deep">
                Every student can build a standard website.
              </h3>
              <p className="text-sm text-muted">
                HTML, CSS, and basic JavaScript — applied to a real site a student can point to
                and say they built. Not a tutorial they followed. A project they own.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                {["Structure a multi-page site", "Style it properly with CSS", "Add basic interactivity with JavaScript", "Deploy it live"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-muted">
                    <span className="shrink-0 text-brass">—</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[3px] border border-navy bg-surface p-10 shadow-[0_16px_40px_-20px_rgba(27,53,94,0.22)]">
              <div className="mb-4 font-mono text-[11px] tracking-widest text-brass uppercase">
                By end of SSS3
              </div>
              <h3 className="mb-3 font-serif text-[26px] font-semibold leading-[1.2] text-navy-deep">
                Every student can build a standard app.
              </h3>
              <p className="text-sm text-muted">
                Backend logic, databases, user accounts — the kind of software that actually
                does something. SSS3 students finish with a capstone project and a portfolio
                ready for university or employment.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                {["Build a full-stack web application", "Work with databases and APIs", "Implement user authentication", "Present a portfolio-ready capstone"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-muted">
                    <span className="shrink-0 text-navy">—</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-navy-deep py-[88px]" id="features">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-14">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              How it works
            </span>
            <h2 className="mb-3 font-serif text-[34px] font-semibold text-white">
              Built for how Nigerian schools actually operate.
            </h2>
            <p className="max-w-[540px] text-base text-white/55">
              Not a generic SaaS product bolted onto a school. Every feature was designed around
              the specific constraints — power, internet, devices, and timetables — that every
              secondary school in Nigeria deals with.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px bg-white/10 md:grid-cols-3">
            {[
              {
                title: "Works offline",
                body: "Install once on the school server. Lessons, quizzes, and dashboards run on the local network — no internet required for students or teachers during class.",
              },
              {
                title: "AI-assisted marking",
                body: "Practical exam submissions go to AI first. Teachers see a suggested mark and a short summary of the work — they confirm, they don't redo it from scratch.",
              },
              {
                title: "Results feed",
                body: "Every student has a live results feed. Teachers see a class-level view. The school admin sees the whole school — all from the same data, no manual collation.",
              },
              {
                title: "Three dashboards",
                body: "Student, teacher, and school admin — each role gets a dashboard with exactly what they need. No shared logins, no excess access, no configuration required.",
              },
              {
                title: "Per-class syllabus",
                body: "Each class follows a structured syllabus mapped to the full JSS1–SSS3 curriculum. Progress tracked per student, per subject, per lesson — automatically.",
              },
              {
                title: "Built-in AI tutor",
                body: "Students can ask the AI tutor questions about any lesson. It answers in context, keeps a record of gaps, and flags recurring confusion to the teacher.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-navy-deep p-8">
                <h3 className="mb-3 text-base font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-[1.7] text-white/55">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-[88px]" id="pricing">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mx-auto max-w-[560px] text-center">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Pricing
            </span>
            <h2 className="mb-3 font-serif text-[34px] font-semibold text-navy-deep">
              One school. One price.
            </h2>
            <p className="mb-12 text-base text-muted">
              A single monthly subscription covers every student and teacher in your school.
              No per-seat fees. No surprise add-ons.
            </p>

            <div className="rounded-[3px] border border-navy bg-surface p-10 text-left shadow-[0_20px_50px_-20px_rgba(27,53,94,0.25)]">
              <div className="mb-1.5 font-mono text-xs text-muted">Per school, billed monthly</div>
              <div className="mb-2 font-serif text-[52px] font-semibold text-navy-deep">
                ₦150,000
                <span className="font-sans text-xl font-normal text-muted"> /month</span>
              </div>
              <ul className="my-8 space-y-0">
                {[
                  "Full JSS1–SSS3 curriculum, all subjects",
                  "Unlimited student and teacher accounts",
                  "Student, teacher, and admin dashboards",
                  "Offline operation on your school's local network",
                  "AI-assisted marking for practical exam work",
                  "Built-in AI tutor for students",
                  "Live results feed and progress reports",
                ].map((item) => (
                  <li key={item} className="flex gap-3 border-t border-line py-3 text-sm text-muted">
                    <span className="shrink-0 text-brass">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:hello@compile.ng"
                className="block w-full rounded-[2px] bg-navy py-[13px] text-center text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
              >
                Book a demo
              </a>
              <p className="mt-4 text-center font-mono text-[11px] text-muted">
                We&apos;ll schedule a walkthrough for your school before you commit to anything.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
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

        <nav className="hidden items-center gap-9 md:flex">
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

        <a
          href="#pricing"
          className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          Book a demo
        </a>
      </div>
    </header>
  );
}
