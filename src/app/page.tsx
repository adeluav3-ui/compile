import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="py-[110px] text-center">
        <div className="mx-auto max-w-[1120px] px-8">
          <span className="mb-5 block font-mono text-xs tracking-[0.1em] text-brass uppercase">
            Learn by shipping, not by watching
          </span>
          <h1 className="mx-auto mb-6 max-w-[820px] font-serif text-[56px] font-semibold leading-[1.08] tracking-[-0.02em] text-navy-deep">
            Software is a craft.<br />We teach it like{" "}
            <em className="not-italic text-steel">one</em>.
          </h1>
          <p className="mx-auto mb-9 max-w-[520px] text-[17px] text-muted">
            Compile is a coding education studio built around one idea: you learn to build by
            building — with someone correcting your work as you go, not a library you&apos;re left
            alone with.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/cohort"
              className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              See the live cohort
            </Link>
            <Link
              href="/#programs"
              className="rounded-[2px] border border-line px-[18px] py-[11px] text-sm font-medium text-ink"
            >
              Explore all programs
            </Link>
          </div>
        </div>
      </section>

      {/* THREE PATHS */}
      <section className="pb-24" id="programs">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mx-auto mb-12 max-w-[600px] text-center">
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Three ways in
            </span>
            <h2 className="font-serif text-[30px] font-semibold text-navy-deep">
              One craft, three doors.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.15fr_1fr_1fr]">
            {/* Cohort — live */}
            <div className="flex flex-col rounded-[3px] border border-navy bg-surface p-8 shadow-[0_16px_36px_-18px_rgba(27,53,94,0.28)]">
              <span className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-[2px] bg-[#E4EEE6] px-[9px] py-1 font-mono text-[10px] tracking-[0.06em] text-[#2E6E45] uppercase">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2E6E45]" />
                Live — applications open
              </span>
              <h3 className="mb-2.5 font-serif text-[21px] font-semibold text-navy-deep">Cohort</h3>
              <p className="mb-5 grow text-sm text-muted">
                Small, live, 10-week batches — each one focused on building a different kind of
                software. Cohort 01 is web apps, websites, and platforms.
              </p>
              <Link href="/cohort" className="text-sm font-semibold text-navy">
                View Cohort 01 →
              </Link>
              <div className="mt-auto border-t border-line pt-3.5 font-mono text-[11px] text-muted">
                Next batch starts Oct 3, 2026
              </div>
            </div>

            {/* Individual — soon */}
            <div className="flex flex-col rounded-[3px] border border-line bg-surface p-8">
              <span className="mb-5 inline-flex w-fit items-center rounded-[2px] bg-line px-[9px] py-1 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">
                Coming soon
              </span>
              <h3 className="mb-2.5 font-serif text-[21px] font-semibold text-navy-deep">
                Individual Course
              </h3>
              <p className="mb-5 grow text-sm text-muted">
                A self-paced library covering everything taught in the cohort and school editions —
                for builders who want the material without live access.
              </p>
              <Link href="/cohort#individual" className="text-sm font-semibold text-[#9A9FA6]">
                Get notified →
              </Link>
              <div className="mt-auto border-t border-line pt-3.5 font-mono text-[11px] text-muted">
                In development
              </div>
            </div>

            {/* School Edition — soon */}
            <div className="flex flex-col rounded-[3px] border border-line bg-surface p-8">
              <span className="mb-5 inline-flex w-fit items-center rounded-[2px] bg-line px-[9px] py-1 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">
                Coming soon
              </span>
              <h3 className="mb-2.5 font-serif text-[21px] font-semibold text-navy-deep">
                School Edition
              </h3>
              <p className="mb-5 grow text-sm text-muted">
                A full JSS1–SSS3 curriculum for schools — course content, practical exams, and
                dashboards for teachers, students, and school admins.
              </p>
              <Link href="#" className="text-sm font-semibold text-[#9A9FA6]">
                Learn more →
              </Link>
              <div className="mt-auto border-t border-line pt-3.5 font-mono text-[11px] text-muted">
                Built after Cohort 01
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="bg-navy-deep py-[90px] text-white">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-16 px-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="mb-4 block font-mono text-xs tracking-[0.08em] text-brass uppercase">
              Why &ldquo;craft&rdquo;
            </span>
            <h2 className="font-serif text-[32px] font-semibold leading-[1.2] text-white">
              A craftsman doesn&apos;t learn from a manual. They learn at someone&apos;s side.
            </h2>
          </div>

          <div className="flex flex-col gap-7">
            <div className="flex gap-[18px]">
              <span className="shrink-0 pt-0.5 font-mono text-[13px] text-brass">01</span>
              <div>
                <h4 className="mb-1.5 text-base font-semibold text-white">Built live, corrected live</h4>
                <p className="text-sm text-white/60">
                  Every program is anchored around real building — with correction happening as you
                  work, not after.
                </p>
              </div>
            </div>
            <div className="flex gap-[18px]">
              <span className="shrink-0 pt-0.5 font-mono text-[13px] text-brass">02</span>
              <div>
                <h4 className="mb-1.5 text-base font-semibold text-white">Small by design</h4>
                <p className="text-sm text-white/60">
                  Cohorts are capped tightly on purpose. You get seen, not lost in a crowd of
                  hundreds.
                </p>
              </div>
            </div>
            <div className="flex gap-[18px]">
              <span className="shrink-0 pt-0.5 font-mono text-[13px] text-brass">03</span>
              <div>
                <h4 className="mb-1.5 text-base font-semibold text-white">One craft, many disciplines</h4>
                <p className="text-sm text-white/60">
                  Web today, mobile and games next, then AI — the same live, build-first method
                  applied to whatever you want to make.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
