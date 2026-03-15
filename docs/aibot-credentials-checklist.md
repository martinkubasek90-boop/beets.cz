# AIBot Credentials Checklist

## Povinné minimum pro první produkční verzi

- `ANTHROPIC_API_KEY`
- `N8N_AIBOT_WEBHOOK_URL`
- `N8N_AIBOT_WEBHOOK_TOKEN`

## Doporučené credentials v n8n

### Claude
- Provider: Anthropic
- Credential: API key
- Env:
  - `ANTHROPIC_API_KEY`

### E-mail
Vyber jednu variantu:

- Gmail OAuth2 přes nativní Gmail node v n8n
- nebo IMAP/SMTP pro obecný mailbox

Pokud chceš Gmail:
- Google Cloud OAuth client
- scope minimálně pro read/send podle režimu
- doporučené node operace:
  - list recent emails
  - get unread emails
  - draft reply

### Asana
- Asana personal access token nebo OAuth app
- potřebuješ:
  - workspace ID
  - project IDs pro sledované projekty
  - případně section IDs pro automatické tasky

### HubSpot
- private app token
- env:
  - `HUBSPOT_PRIVATE_APP_TOKEN`
- doporučené endpointy:
  - recent contacts
  - recent deals
  - notes / engagements

### Google Analytics 4
- nejčistší je service account nebo OAuth2 credential
- potřebuješ:
  - property ID
- doporučené metriky:
  - sessions
  - users
  - conversions
  - totalRevenue
  - key events

### Google Ads
- developer token
- OAuth credential
- customer ID
- optional manager account ID
- doporučené metriky:
  - impressions
  - clicks
  - cost_micros
  - conversions
  - conversions_value

## Doporučené env proměnné v appce

```env
N8N_AIBOT_WEBHOOK_URL=https://n8n.beets.cz/webhook/aibot
N8N_AIBOT_WEBHOOK_TOKEN=CHANGE_ME
ANTHROPIC_API_KEY=CHANGE_ME
AIBOT_ASSISTANT_NAME=Beets AI Assistant
AIBOT_VOICE_ENABLED=true
AIBOT_GMAIL_ENABLED=true
AIBOT_ASANA_ENABLED=true
AIBOT_GA_ENABLED=true
AIBOT_GOOGLE_ADS_ENABLED=true
```

## Reálné minimum pro start

Pokud chceš rozjet první ostrou verzi rychle:

1. Claude
2. HubSpot
3. Asana
4. e-mail

Google Analytics a Google Ads přidej až jako druhou vlnu, protože OAuth a reporting bývají nejvíc křehké.
