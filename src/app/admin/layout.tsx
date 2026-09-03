import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Compile — Super Admin" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-line bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Image
                src="/images/compile-lockup-navy.svg"
                alt="Compile"
                width={90}
                height={38}
                className="h-8 w-auto"
              />
            </Link>
            <span className="rounded-[2px] bg-navy/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-navy">
              Super Admin
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-mono text-xs text-muted transition-colors hover:text-navy"
            >
              Schools
            </Link>
            <Link
              href="/admin/schools/new"
              className="rounded-[3px] bg-navy px-4 py-2 font-mono text-xs text-surface transition-colors hover:bg-navy-deep"
            >
              + Onboard school
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
