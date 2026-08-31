import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto max-w-[1120px] px-6 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Link href="/">
              <Image
                src="/images/compile-lockup-navy.svg"
                alt="Compile"
                width={100}
                height={42}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-3 text-sm text-muted">
              A coding education studio. Cohort, individual, and school programs — everything compiles.
            </p>
          </div>

          <div className="flex gap-12 md:gap-16">
            <div>
              <span className="mb-3.5 block font-mono text-xs tracking-widest text-muted uppercase">
                Programs
              </span>
              <Link href="/cohort" className="mb-2.5 block text-sm text-ink">
                Cohort 01
              </Link>
              <Link href="/individual" className="mb-2.5 block text-sm text-[#B5B9BE]">
                Individual course — soon
              </Link>
              <Link href="/school" className="mb-2.5 block text-sm text-[#B5B9BE]">
                School edition — soon
              </Link>
            </div>
            <div>
              <span className="mb-3.5 block font-mono text-xs tracking-widest text-muted uppercase">
                Institutions
              </span>
              <Link href="/school" className="mb-2.5 block text-sm text-[#B5B9BE]">
                For schools
              </Link>
              <Link href="/school#pricing" className="mb-2.5 block text-sm text-[#B5B9BE]">
                Book a demo
              </Link>
            </div>
            <div>
              <span className="mb-3.5 block font-mono text-xs tracking-widest text-muted uppercase">
                Support
              </span>
              <Link href="/support" className="mb-2.5 block text-sm text-ink">
                Help & Support
              </Link>
              <a href="mailto:hello@compile.ng" className="mb-2.5 block text-sm text-[#B5B9BE]">
                hello@compile.ng
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
