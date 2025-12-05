"use client";

import { cn } from "@/lib/utils";
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

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Hesla se neshodují.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registrace se nezdařila.");
      }

      setSuccess("Zkontroluj e-mail a potvrď registraci. Poté se můžeš přihlásit.");
      setEmail("");
      setPassword("");
      setRepeatPassword("");
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Došlo k chybě při registraci.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-white/15 bg-black/60 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Registrace</CardTitle>
          <CardDescription className="text-[var(--mpc-muted,#c8c8c8)]">
            Vytvoř si účet a potvrď e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
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
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Zopakuj heslo</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button
                type="submit"
                className="w-full border border-[var(--mpc-accent,#f37433)] bg-[var(--mpc-accent,#f37433)] text-black font-semibold hover:bg-[#ff8c4d]"
                disabled={isLoading}
              >
                {isLoading ? "Zakládám účet..." : "Registrovat se"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Už máš účet?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-[var(--mpc-accent,#f37433)] underline underline-offset-4"
              >
                Přihlásit se
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
