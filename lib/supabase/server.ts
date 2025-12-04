// lib/supabase/server.ts

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Serverový Supabase klient pro Next 15/16.
 * Pozor: je ASYNC → všude ho musíš volat jako `const supabase = await createClient();`
 */
export async function createClient() {
  // V Next 15/16 vrací cookies() Promise → musíme await
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Když se setAll volá ze Server Componentu, Next to někdy blokuje.
            // To nevadí, pokud máš middleware, které session obnovuje.
          }
        },
      },
    }
  );
}
