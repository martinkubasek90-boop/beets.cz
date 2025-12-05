"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/profile");
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setError("Profil ještě není ověřen. Otevři potvrzovací e-mail a klikni na odkaz.");
        } else {
          setError(error.message);
        }
      } else {
        setError("Došlo k chybě");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-white/15 bg-black/60 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Přihlášení</CardTitle>
          <CardDescription className="text-[var(--mpc-muted,#c8c8c8)]">
            Zadejte svůj e-mail a heslo pro přihlášení.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jan@domena.cz"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Heslo</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm text-[var(--mpc-accent,#f37433)] underline-offset-4 hover:underline"
                  >
                    Zapomněli jste heslo?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full border border-[var(--mpc-accent,#f37433)] bg-[var(--mpc-accent,#f37433)] text-black font-semibold hover:bg-[#ff8c4d]"
                disabled={isLoading}
              >
                {isLoading ? "Přihlašuji..." : "Přihlásit se"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Nemáte účet?{" "}
              <Link
                href="/auth/sign-up"
                className="font-semibold text-[var(--mpc-accent,#f37433)] underline underline-offset-4"
              >
                Registrovat se
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
