# LinkedIn Public Scraper

Tenhle flow je urceny pro:
- discovery verejnych LinkedIn profilu
- enrichment pres verejne firemni weby
- company-first miner z domen a webu firem
- export leadu do CSV
- manualni import verejnych LinkedIn URL bez search API

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
2. App jede jednou ze 3 cest:

`A) Search discovery`

App slozi query typu:

```text
site:linkedin.com/in/ ("business development" OR "partnerships") ("USA" OR "United States") B2B SaaS
```

Search provider vrati verejne LinkedIn URL.

`B) Manual import`

Do runu vlozis primo seznam verejnych LinkedIn URL.

`C) Company-first miner`

Do runu vlozis:
- seznam domen firem
- pripadne seznam nazvu firem
- nebo bulk CSV radky ve formatu `firma,domena,lokace,segment`
- nebo `Directory URLs`, tedy verejne listing/exhibitor/directory stranky
- lokaci a keywordy pro scoring

Pipeline pak:
- projde homepage firmy
- seed firmy si uklada do queue tabulky
- umi si vygenerovat dalsi seedy z verejnych directory/listing stranek
- dohleda interní stranky typu `/contact`, `/about`, `/team`, `/people`, `/leadership`
- vytahne verejne emaily a telefony
- zkusí najit jmena a role na team/people strankach
- ulozi leady i bez search API

3. Scraper nacte verejnou HTML stranku profilu
4. Parser vytahne:
   - jmeno
   - headline
   - firmu
   - lokaci
5. Enrichment zkusí najit firemni web
6. Z firemnich stranek jako `/`, `/contact`, `/about`, `/team` zkusí vytahnout:
   - verejny email
   - verejny telefon
7. Profil dostane ICP score a jde exportovat do CSV

## High volume discovery

V UI je mozne zapnout `High volume discovery`.

Ten rezim:
- generuje vic query variant z jednoho ICP
- pridava synonyma pro segmenty jako:
  - architects
  - construction firms
  - developers
- umi vratit vic kandidatu nez jeden jednoduchy search query

Je vhodny hlavne pro:
- architektonicka studia
- stavebni firmy
- real estate developery

## Miner mode

`Miner mode` je sirsi discovery rezim:
- dela vic query batchu
- bere vic stran search vysledku
- uklada sirsi pool kandidatu
- enrichment dela jen na `top N` profilech, aby se run nezpomalil
- po prvnim pruchodu muzes spustit `Enrich pending`, ktery znovu projde jen leady bez kontaktu

Pouziti:
- kdyz chces maximalizovat pocet kandidatu
- a enrichment delat jen na casti nejzajimavejsich vysledku

Pro rezim `company miner` je ale nejdulezitejsi kvalitni seznam domen. Tam search API nepotrebujes vubec.

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

## Doporuceny company-first run

V UI nastav:

- `Rezim`: `Company miner`
- `Nazev runu`: `USA architects company miner`
- `Keywords`: `architecture, architect, commercial`
- `Job titles`: `principal architect, founder, owner, project architect`
- `Lokace`: `USA, United States`
- `Company domains`:
  - `gensler.com`
  - `perkinswill.com`
  - `hdrinc.com`
- nebo `Bulk seeds CSV`:
  - `Gensler,gensler.com,USA,architect`
  - `Turner Construction,turnerconstruction.com,USA,general contractor`
- nebo `Directory URLs`:
  - `https://example.com/exhibitors`
  - `https://example.com/member-directory`

Pak:
- klikni `Zalozit run`
- vyber run
- klikni `Start processing`
- po dobehu klikni `Enrich pending`

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

Manual-only varianta je v:

`docs/linkedin-test-run-manual.json`

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
