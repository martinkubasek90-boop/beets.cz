import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-[#070f16] via-[#0b1822] to-[#05090f] text-white">
      <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 p-6 md:p-10">
        <div className="w-full max-w-sm text-right">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
          >
            ← Zpět na homepage
          </Link>
        </div>
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
