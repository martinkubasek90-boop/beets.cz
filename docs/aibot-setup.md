# AIBot Setup

## Co už je hotové v appce

- web klient: `/AIBot`
- backend proxy: `/api/aibot/chat`
- n8n kontrakt: `docs/aibot-n8n-contract.md`
- importovatelný starter workflow: `docs/n8n-aibot-starter.workflow.json`
- morning brief workflow: `docs/n8n-aibot-morning-brief.workflow.json`
- campaign watchdog workflow: `docs/n8n-aibot-campaign-watchdog.workflow.json`
- integrační mapa: `docs/aibot-node-map.md`
- HTTP request konfigurace: `docs/aibot-http-configs.md`
- env šablona: `.env.aibot.example`

## Co udělat teď v n8n

1. Otevři n8n.
2. Importuj `docs/n8n-aibot-starter.workflow.json`.
3. Nastav webhook path na `aibot`.
4. Přidej env `ANTHROPIC_API_KEY`.
5. Aktivuj workflow.
6. Zkopíruj produkční webhook URL.
7. Ulož ji do `N8N_AIBOT_WEBHOOK_URL`.
8. Pokud chceš bearer ochranu, přidej `N8N_AIBOT_WEBHOOK_TOKEN` a stejné ověření v n8n.

## Doporučená architektura pro 24/7 provoz

- Web `/AIBot` pouze sbírá vstup a přehrává odpověď.
- n8n drží orchestrace, přístupy, plánované summary a akce.
- Claude řeší reasoning, shrnutí a návrhy.
- Akce do externích systémů jdou přes n8n nodes.

## Doporučené workflowy

### 1. Realtime assistant
- webhook trigger
- data collectors
- Claude
- JSON response

### 2. Morning brief
- cron každý den ráno
- e-mail + Asana + HubSpot + Ads + Analytics
- Claude summary
- poslat do e-mailu / Telegramu / Slacku

### 3. Lead follow-up assistant
- HubSpot trigger
- enrichment
- draft follow-up mailu
- approval step nebo auto-send

### 4. Campaign watchdog
- cron každou hodinu
- Google Ads + GA4
- detekce anomálií
- alert do mailu nebo Asany

## Import order v n8n

1. `docs/n8n-aibot-starter.workflow.json`
2. `docs/n8n-aibot-morning-brief.workflow.json`
3. `docs/n8n-aibot-campaign-watchdog.workflow.json`

Pak doplň skutečné nodes podle `docs/aibot-node-map.md`.

## Reálné doporučení

Nedělej první verzi jako plně autonomního bota s právem vše posílat a zakládat. První ostrá verze má být:

- read-heavy
- write-light
- s approval krokem pro e-maily a zásahy do CRM

To ti dá mnohem menší provozní riziko.
