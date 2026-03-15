# AIBot Admin Checklist

## Co je lepší

Lepší je admin rozhraní než ruční edit `.env`, protože:

- můžeš to doplňovat postupně
- vidíš stav připravenosti integrací
- nemusíš při každé změně řešit deploy
- můžeš mít oddělený interní přístup přes `AIBOT_ADMIN_TOKEN`

## Postup

1. V Supabase spusť:
   - `supabase/aibot_admin_config.sql`
2. Nastav do appky:
   - `AIBOT_ADMIN_TOKEN`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Otevři:
   - `/AIBot/admin`
4. Vyplň:
   - Claude API key
   - n8n webhook URL + token
   - HubSpot
   - Asana
   - Gmail
   - GA4
   - Google Ads
5. Ulož konfiguraci.
6. Potom nahraď `TODO` uzly v n8n skutečnými HTTP/Gmail/Asana/HubSpot nodes.

## Minimum pro první ostrou verzi

- Claude
- n8n webhook
- HubSpot
- Asana
- e-mail

## Druhá vlna

- GA4
- Google Ads
- autonomní akce

## Bezpečnost

- admin page drž jen interně
- používej `AIBOT_ADMIN_TOKEN`
- ideálně nepovoluj veřejný přístup bez tokenu
- počítej s tím, že tajné údaje jsou uložené v Supabase JSON konfiguraci
