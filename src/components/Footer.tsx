import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-14">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-start justify-between gap-6 px-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2 font-serif text-xl font-bold text-navy-deep">
            <span className="inline-block h-2.5 w-2.5 rounded-[1px] bg-brass" />
            Compile
          </div>
          <p className="mt-3 text-sm text-muted">
            A coding education studio. Cohort, individual, and school programs — one craft, taught by building.
          </p>
        </div>

        <div className="flex gap-16">
          <div>
            <span className="mb-3.5 block font-mono text-xs tracking-widest text-muted uppercase">
              Programs
            </span>
            <Link href="/cohort" className="mb-2.5 block text-sm text-ink">
              Cohort 01
            </Link>
            <Link href="/cohort#individual" className="mb-2.5 block text-sm text-[#B5B9BE]">
              Individual course — soon
            </Link>
            <Link href="#" className="mb-2.5 block text-sm text-[#B5B9BE]">
              School edition — soon
            </Link>
          </div>
          <div>
            <span className="mb-3.5 block font-mono text-xs tracking-widest text-muted uppercase">
              Institutions
            </span>
            <Link href="#" className="mb-2.5 block text-sm text-[#B5B9BE]">
              Teacher dashboard — soon
            </Link>
            <Link href="#" className="mb-2.5 block text-sm text-[#B5B9BE]">
              School dashboard — soon
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
