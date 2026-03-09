<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Proxy
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## BESS Investment Model (Python)

The repository includes a standalone Python investment model for a commercial BESS project in CZ (2026 assumptions).

Run locally:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/bess_investment_model.py
```

Edit inputs at the top of the script:
- `scripts/bess_investment_model.py`

## BESS Chatbot Knowledge Base (RAG MVP)

The BESS calculator chatbot supports a URL-based knowledge base with source citations.

Setup:

1. Create DB tables in Supabase SQL editor:
   - `supabase/bess_knowledge.sql`
2. Ensure env vars are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Optional admin token for ingestion endpoint:
   - `BESS_KB_ADMIN_TOKEN`

API endpoints:
- `POST /api/bess-kb/ingest`
  - URL ingest body example:
    ```json
    {
      "namespace": "bess",
      "items": [
        { "type": "url", "url": "https://www.memodo.cz/produkt-1", "label": "Memodo produkt 1" }
      ]
    }
    ```
  - Text ingest body example:
    ```json
    {
      "namespace": "bess",
      "items": [
        { "type": "text", "label": "Interní poznámka", "text": "..." }
      ]
    }
    ```
  - Sitemap discovery example:
    ```json
    {
      "namespace": "bess",
      "sitemapUrl": "https://www.memodo.cz/sitemap.xml",
      "discoverOnly": true,
      "maxUrls": 2500
    }
    ```
  - If `BESS_KB_ADMIN_TOKEN` is set, pass header:
    - `Authorization: Bearer <token>`
- `POST /api/bess-chat`
  - Returns assistant reply + optional `citations` from KB.
- `POST /api/bess-kb/upload`
  - multipart/form-data upload (`files[]`) for documents.
  - Supported: `pdf`, `txt`, `md`, `csv`, `json`, `xml`, `html`.
  - PDF extraction uses LLM (`LLM_API_KEY` required).

Strict anti-hallucination mode:
- `BESS_CHAT_STRICT_KB=true` (default): chatbot refuses to answer when no citation is found.
- `BESS_CHAT_STRICT_KB=false`: fallback answers are allowed.

URL allowlist:
- `BESS_KB_ALLOWED_HOSTS=memodo.cz,www.memodo.cz`
- Ingestion rejects URLs outside this host allowlist.

Admin page for calculator/chatbot:
- URL: `/kalkulacka/admin`
- API config endpoint: `GET/PUT /api/kalkulacka/admin-config`
- Optional token for config changes:
  - `BESS_ADMIN_TOKEN`
- Optional token for KB ingest actions:
  - `BESS_KB_ADMIN_TOKEN`

HubSpot lead integration:
- Endpoint: `POST /api/hubspot/lead`
- Triggered from BESS lead modal submit (`pdf` and `analysis` requests)
- Required env:
  - `HUBSPOT_PRIVATE_APP_TOKEN`
- Optional env for automatic Deal creation:
  - `HUBSPOT_PIPELINE`
  - `HUBSPOT_DEAL_STAGE`

Memodo inquiry integration:
- Endpoint: `POST /api/hubspot/memodo-inquiry`
- Triggered from `/Memodo/poptavka` submit.
- Required env:
  - `HUBSPOT_PRIVATE_APP_TOKEN`
- Optional env for Memodo-specific Deal pipeline:
  - `HUBSPOT_MEMODO_PIPELINE` (fallback: `HUBSPOT_PIPELINE`)
  - `HUBSPOT_MEMODO_DEAL_STAGE` (fallback: `HUBSPOT_DEAL_STAGE`)
- Optional follow-up email env:
  - `MEMODO_SALES_EMAIL` (internal notification recipient)
  - SMTP/webhook env from `lib/email.ts` (`SMTP_*`, `NOTIFY_EMAIL_FROM`, etc.)
- Optional inquiry history storage (per e-mail account identity):
  - SQL schema: `supabase/memodo_inquiries.sql`
  - API: `GET/DELETE /api/memodo/inquiries`
  - each successful Memodo inquiry is stored with e-mail + HubSpot contact/deal IDs

Memodo XML catalog import:
- SQL schema:
  - `supabase/memodo_catalog.sql`
  - optional dummy seed for testing before XML feed:
    - `supabase/memodo_dummy_products_seed.sql`
- Import endpoint:
  - `POST /api/memodo/import-xml`
- Optional read endpoints:
  - `GET /api/memodo/products`
  - `GET /api/memodo/products/:id`
- Env:
  - `MEMODO_XML_FEED_URL` (default feed URL for import endpoint)
  - `MEMODO_FEED_IMPORT_TOKEN` (optional Bearer token protection)
  - feed auth (optional, when supplier protects XML):
    - `MEMODO_XML_FEED_AUTH_TYPE` = `none|basic|bearer|header|query`
    - `MEMODO_XML_FEED_USERNAME`, `MEMODO_XML_FEED_PASSWORD` (for `basic`)
    - `MEMODO_XML_FEED_TOKEN` (for `bearer|header|query`)
    - `MEMODO_XML_FEED_HEADER_NAME` (for `header`, default `X-Feed-Token`)
    - `MEMODO_XML_FEED_QUERY_PARAM` (for `query`, default `token`)
  - static-IP proxy mode (optional):
    - `MEMODO_FEED_USE_PROXY=true`
    - `MEMODO_FEED_PROXY_URL` (e.g. `https://proxy.example.com/fetch`)
    - `MEMODO_FEED_PROXY_AUTH_TYPE` = `none|basic|bearer|header`
    - `MEMODO_FEED_PROXY_USERNAME`, `MEMODO_FEED_PROXY_PASSWORD` (for `basic`)
    - `MEMODO_FEED_PROXY_TOKEN` (for `bearer|header`)
    - `MEMODO_FEED_PROXY_HEADER_NAME` (for `header`, default `X-Proxy-Token`)
    - `MEMODO_FEED_TIMEOUT_MS` (optional, default `25000`)
- Example import call:
  - `curl -X POST https://beets.cz/api/memodo/import-xml -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"deactivateMissing":true}'`
  - dry-run:
  - `curl -X POST https://beets.cz/api/memodo/import-xml -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"dryRun":true}'`
- Large feed mode (recommended for 30k+ items):
  - request body supports:
    - `startIndex` (default `0`)
    - `batchSize` (default `800`)
    - `syncStartedAt` (timestamp returned by first batch; reuse for all following batches)
    - `finalize` (`true` on last batch to deactivate missing products)
  - response contains:
    - `nextStartIndex`, `done`, `syncStartedAt`, `processedCount`
  - pagination read API:
    - `GET /api/memodo/products?offset=0&limit=40&q=...&category=...&promo=1&in_stock=1&sort=popular|price_asc|price_desc|name`
  - proxy request contract:
    - importer sends `POST` JSON to `MEMODO_FEED_PROXY_URL`:
      - `targetUrl` (string)
      - `method` (always `GET`)
      - `headers` (object)
    - proxy should return:
      - plain XML text, or
      - JSON with `xml` field (`{ "xml": "<...>" }`)

Memodo admin:
- URL: `/Memodo/admin`
- API endpoint: `GET/PUT /api/memodo/admin-config`
- SQL schema:
  - `supabase/memodo_admin_config.sql`
  - `supabase/memodo_price_allowlist.sql` (allowlist e-mailů pro ceny)
  - `supabase/memodo_events.sql` (volitelné: event analytics dashboard)
- Optional env protection:
  - `MEMODO_ADMIN_TOKEN` (Bearer token for saving config/import actions)
- Admin controls:
  - ruční výběr featured product IDs pro sekci `Akční produkty`
  - přepínač `catalogRequiresSearch` (produkty v katalogu až po fulltextu)
  - AI feature toggles (`aiSearchEnabled`, `shoppingChatbotEnabled`, `technicalAdvisorEnabled`)
  - AI prompt nastavení pro nákupního chatbota a technického poradce
  - XML feed auth mode (none/basic/bearer/custom header/query token) + one-run credentials
  - funnel analytics + top searches (pokud existuje tabulka `memodo_events`)
  - allowlist e-mailů: ceny vidí jen schválené e-maily

Memodo price access:
- `GET /api/memodo/price-access` (vrací `canSeePrices` + aktivní e-mail identitu)
- `POST /api/memodo/price-access` (nastaví e-mail identitu/cookie pro app účet)
- `GET/PUT /api/memodo/price-allowlist` (admin token required)
- `POST /api/memodo/auth/request-link`
  - odešle magic-link pouze pokud je e-mail v allowlistu

LLM modes for chatbot:
- `LLM_MODE=off` (default): rule-based + RAG citations only.
- `LLM_MODE=trial`: uses remote LLM API (trial key).
  - Required:
    - `LLM_API_KEY`
  - Optional:
    - `LLM_API_URL` (default `https://api.openai.com/v1/chat/completions`)
    - `LLM_MODEL` (default `gpt-4o-mini`)
- `LLM_MODE=local`: uses local Ollama.
  - Optional:
    - `OLLAMA_URL` (default `http://127.0.0.1:11434/api/chat`)
    - `OLLAMA_MODEL` (default `llama3.1:8b`)

Example env:
```env
LLM_MODE=trial
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
```

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
  ```
  > [!NOTE]
  > This example uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
  > Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be used in this example.
  > See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

  Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
