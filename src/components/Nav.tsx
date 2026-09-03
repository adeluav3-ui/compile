"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type NavLink = {
  href: "/" | "/cohort" | "/individual" | "/school" | "/contact" | "/school/login";
  label: string;
  pill?: string;
};

const links: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/cohort", label: "Cohort 01" },
  { href: "/individual", label: "Individual", pill: "Waitlist" },
  { href: "/school", label: "For Schools", pill: "Soon" },
  { href: "/contact", label: "Contact" },
  { href: "/school/login", label: "School Login" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-6 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Image
            src="/images/compile-lockup-navy.svg"
            alt="Compile"
            width={100}
            height={42}
            priority
            className="h-9 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-navy-deep"
            >
              {l.label}
              {l.pill && (
                <span className="font-mono rounded-[2px] bg-line px-1.5 py-0.5 text-[10px] tracking-wider text-muted">
                  {l.pill}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/cohort"
          className="hidden rounded-[2px] bg-navy px-5 py-[10px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep md:block"
        >
          Join Cohort 01
        </Link>

        {/* Mobile: CTA + hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/cohort"
            className="rounded-[2px] bg-navy px-4 py-[9px] text-[13px] font-semibold text-white"
          >
            Join Cohort 01
          </Link>
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-[2px]"
          >
            <span
              className={`h-[1.5px] w-5 bg-ink transition-all duration-200 ${open ? "translate-y-[6.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-[1.5px] w-5 bg-ink transition-all duration-200 ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`h-[1.5px] w-5 bg-ink transition-all duration-200 ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-paper px-6 pb-5 pt-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-[2px] px-2 py-3 text-[15px] font-medium text-ink hover:bg-line/60"
              >
                <span className="flex items-center gap-2">
                  {l.label}
                  {l.pill && (
                    <span className="font-mono rounded-[2px] bg-line px-1.5 py-0.5 text-[10px] tracking-wider text-muted">
                      {l.pill}
                    </span>
                  )}
                </span>
                <span className="text-muted">›</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
