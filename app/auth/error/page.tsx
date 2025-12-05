import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  const raw = params?.error || "";
  let message = raw;
  if (!raw) {
    message = "Došlo k neznámé chybě.";
  } else if (raw.toLowerCase().includes("no token hash")) {
    message = "Odkaz je neplatný nebo už byl použit. Zkus se přihlásit.";
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        Pokud problém přetrvává, otevři nový potvrzovací odkaz nebo se vrať na přihlášení.
      </p>
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Omlouváme se, něco se pokazilo.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
              <div className="mt-4 text-sm text-muted-foreground">
                <a href="/auth/login" className="underline">Přejít na přihlášení</a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
