"use client";

export default function NotifyForm() {
  return (
    <form
      className="flex max-w-[380px] gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: wire to email capture API route
      }}
    >
      <input
        type="email"
        placeholder="you@email.com"
        className="flex-1 rounded-[2px] border border-line bg-paper px-3.5 py-[11px] font-sans text-sm"
      />
      <button
        type="submit"
        className="rounded-[2px] bg-navy px-5 py-[11px] text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
      >
        Notify me
      </button>
    </form>
  );
}
