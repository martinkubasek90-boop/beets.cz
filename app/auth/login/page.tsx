import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-[#05090f] via-[#08121b] to-[#03060b] text-white">
      <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 p-6 md:p-10">
        <div className="w-full max-w-sm text-right">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--mpc-accent,#f37433)] bg-[var(--mpc-accent,#f37433)] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-black shadow-[0_10px_24px_rgba(243,116,51,0.3)] hover:bg-[#ff8c4d]"
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
