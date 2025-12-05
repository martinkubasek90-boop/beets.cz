import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 text-white">
      <div className="w-full max-w-sm">
        <Card className="border border-white/15 bg-black/60 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <CardHeader>
            <CardTitle className="text-2xl">Díky za registraci!</CardTitle>
            <CardDescription className="text-[var(--mpc-muted,#c8c8c8)]">
              Potvrď e-mail, potom se můžeš přihlásit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--mpc-muted,#c8c8c8)]">
              Poslali jsme ti potvrzovací e-mail. Klikni na odkaz a aktivuj účet, pak se přihlas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
