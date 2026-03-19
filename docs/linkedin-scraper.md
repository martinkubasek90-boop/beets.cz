# LinkedIn Public Scraper

Tenhle flow je urceny pro:
- discovery verejnych LinkedIn profilu
- enrichment pres verejne firemni weby
- export leadu do CSV

Neni urceny pro:
- neveerejna LinkedIn data
- login-only scraping
- garantovane osobni e-maily nebo osobni telefony

## Nutne env promenne

Do `.env.local` nastav:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SERPER_API_KEY=...
LINKEDIN_SCRAPER_TOKEN=...
```

Misto `SERPER_API_KEY` muzes pouzit:

```env
SERPAPI_API_KEY=...
```

## SQL schema

V Supabase spust:

```sql
\i supabase/linkedin_scraper.sql
```

Nebo obsah souboru `supabase/linkedin_scraper.sql` vloz do SQL editoru.

## Jak pipeline funguje

1. Vytvoris run v `/linkedin`
2. App slozi query typu:

```text
site:linkedin.com/in/ ("business development" OR "partnerships") ("USA" OR "United States") B2B SaaS
```

3. Search provider vrati verejne LinkedIn URL
4. Scraper nacte verejnou HTML stranku profilu
5. Parser vytahne:
   - jmeno
   - headline
   - firmu
   - lokaci
6. Enrichment zkusí najit firemni web
7. Z firemnich stranek jako `/`, `/contact`, `/about`, `/team` zkusí vytahnout:
   - verejny email
   - verejny telefon
8. Profil dostane ICP score a jde exportovat do CSV

## Co dela enrichment

Enrichment je uz hotovy v kodu.

Konretne:
- najde pravdepodobny oficialni web firmy
- projde verejne stranky firmy
- regexem vytahne emaily a telefony
- preferuje email na firemni domene
- ulozi `contact_email`, `contact_phone`, `contact_source`, `contact_confidence`

To znamena:
- `ano`, umi dohledat mail a telefon
- `ne`, negarantuje osobni kontakt konkretniho cloveka
- casto najde obecny firemni kontakt typu `sales@`, `hello@`, `info@`

## Test run pro B2B business development v USA

V UI nastav:

- `Nazev runu`: `USA B2B business development`
- `Keywords`: `B2B, SaaS`
- `Job titles`: `business development, partnerships, sales director`
- `Lokace`: `USA, United States`

Pak:
- klikni `Zalozit run`
- vyber run
- klikni `Start processing`

Stejny payload je pripraveny v:

`docs/linkedin-test-run.json`

Pres API muzes run zalozit takto:

```bash
curl -X POST http://localhost:3000/api/linkedin/search \
  -H "Content-Type: application/json" \
  --data @docs/linkedin-test-run.json
```

## CLI spusteni

S bezicim Next serverem:

```bash
npm run linkedin:scrape
```

Pro konkretni run:

```bash
LINKEDIN_RUN_ID=<uuid> npm run linkedin:scrape
```

Pro jinou endpoint URL:

```bash
LINKEDIN_PROCESS_URL=https://beets.cz/api/linkedin/process npm run linkedin:scrape
```
