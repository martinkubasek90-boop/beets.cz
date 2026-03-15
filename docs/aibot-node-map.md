# AIBot Node-by-Node Map

## 1. Realtime assistant

### Vstup
- `Webhook`
  - přijme dotaz z webu `/api/aibot/chat`
- `Code: Normalize Request`
  - vyčistí text
  - detekuje intent
  - nastaví `requestedSources`

### Sběr kontextu
- `Gmail` nebo `IMAP Email`
  - načti poslední nepřečtené zprávy
  - vrať `emailSummary`
- `Asana`
  - načti úkoly assigned to me
  - due today / overdue / blocked
  - vrať `asanaSummary`
- `HubSpot`
  - načti nové kontakty, nové leady, otevřené dealy
  - vrať `hubspotSummary`
- `Google Analytics`
  - sessions, users, conversions, trend vs previous period
  - vrať `ga4Summary`
- `Google Ads`
  - spend, clicks, conversions, ROAS
  - vrať `googleAdsSummary`

### Reasoning
- `Code: Build Claude Payload`
  - složí prompt + kontext
- `HTTP Request` nebo Anthropic node
  - zavolá Claude
- `Code: Format Response`
  - vytáhne `reply`, `actions`, `sources`
- `Respond to Webhook`

## 2. Morning brief

### Trigger
- `Schedule Trigger`
  - každý den třeba `07:30 Europe/Prague`

### Kontext
- `Gmail`
  - unread count
  - urgent senders
  - čekající odpovědi
- `Asana`
  - due today
  - overdue
  - blocked
- `HubSpot`
  - nové leady včera/dnes
  - dealy bez follow-upu
  - dealy close date this week
- `Google Analytics`
  - yesterday performance
  - top channels
  - anomalie
- `Google Ads`
  - yesterday spend / conversions / CPA / ROAS

### Syntéza
- `Merge` nebo `Code`
  - spoj summary do jednoho JSON
- `Claude`
  - krátký ranní brief
- výstup:
  - `Email`
  - nebo `Telegram`
  - nebo `Slack`

## 3. Campaign watchdog

### Trigger
- `Schedule Trigger`
  - každou hodinu nebo každé 2 hodiny

### Data
- `Google Ads`
  - performance za dnešek
  - performance vs včera / last 7d average
- `Google Analytics`
  - landing page conversion / sessions / events

### Detekce
- `Code: anomaly detector`
  - high spend + low conversion
  - zero conversions
  - CPA spike
  - ROAS drop
  - traffic drop

### Akce
- `IF`
  - pokud bez alertu, stop
- `Claude`
  - vysvětlení + doporučení
- `Email` / `Asana Create Task` / `Slack`

## 4. Detail map by integration

### Gmail
- Node 1: `Gmail -> Message -> Get Many`
- Node 2: `Code -> summarize unread threads`
- Node 3: optional `Gmail -> Draft`

### Asana
- Node 1: `Asana -> Task -> Get Many`
- Node 2: `Asana -> Project -> Get`
- Node 3: `Code -> prioritize tasks`
- Node 4: optional `Asana -> Task -> Create`

### HubSpot
- Node 1: `HTTP Request -> /crm/v3/objects/contacts/search`
- Node 2: `HTTP Request -> /crm/v3/objects/deals/search`
- Node 3: `Code -> hot leads / stale deals`
- Node 4: optional `HTTP Request -> create note`

### Google Analytics 4
- Node 1: `HTTP Request` nebo community GA4 node
- Node 2: report for daily metrics
- Node 3: `Code -> trend comparison`

### Google Ads
- Node 1: `HTTP Request` nebo Google Ads node
- Node 2: campaign performance query
- Node 3: `Code -> anomalies and winners`

## 5. Doporučené JSON kontrakty

### emailSummary
```json
{
  "unreadCount": 12,
  "urgentThreads": [
    {
      "from": "name@example.com",
      "subject": "Urgent request",
      "summary": "Needs response today"
    }
  ]
}
```

### asanaSummary
```json
{
  "dueToday": 4,
  "overdue": 2,
  "blocked": 1,
  "topTasks": [
    {
      "name": "Review landing page",
      "priority": "high"
    }
  ]
}
```

### hubspotSummary
```json
{
  "newLeads": 5,
  "staleDeals": 2,
  "hotDeals": [
    {
      "name": "Brand partnership",
      "amount": 120000
    }
  ]
}
```

### ga4Summary
```json
{
  "sessions": 1450,
  "users": 1190,
  "conversions": 34,
  "topChannels": [
    "Organic Search",
    "Paid Search"
  ]
}
```

### googleAdsSummary
```json
{
  "spend": 5820,
  "clicks": 1241,
  "conversions": 23,
  "roas": 4.2,
  "alerts": [
    "Brand Search CPA +38% vs yesterday"
  ]
}
```
