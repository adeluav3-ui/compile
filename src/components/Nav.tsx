import Link from "next/link";
import Image from "next/image";

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex h-[76px] max-w-[1120px] items-center justify-between px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/compile-lockup-navy.svg"
            alt="Compile"
            width={110}
            height={28}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          <Link href="/cohort" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Cohort 01
          </Link>
          <Link href="/#programs" className="text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Programs
          </Link>
          <Link href="/individual" className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            Individual
            <span className="font-mono rounded-[2px] bg-line px-1.5 py-0.5 text-[10px] tracking-wider text-muted">
              Waitlist
            </span>
          </Link>
          <Link href="/school" className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-navy-deep">
            For Schools
            <span className="font-mono rounded-[2px] bg-line px-1.5 py-0.5 text-[10px] tracking-wider text-muted">
              Soon
            </span>
          </Link>
        </nav>

        <Link
          href="/cohort"
          className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          Join Cohort 01
        </Link>
      </div>
    </header>
  );
}
