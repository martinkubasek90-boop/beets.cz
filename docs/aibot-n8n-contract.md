# AIBot n8n Contract

Frontend endpoint:

- `POST /api/aibot/chat`

This route forwards requests to:

- `N8N_AIBOT_WEBHOOK_URL`

## Request body sent to n8n

```json
{
  "message": "Shrň mi dnešní leady a výkon kampaní.",
  "mode": "text",
  "sessionId": "beets-web-client",
  "source": "beets-web",
  "timestamp": "2026-03-15T14:00:00.000Z"
}
```

## Expected n8n response

```json
{
  "reply": "Dnes přišlo 8 nových leadů. Nejvíc konvertuje kampaň Brand Search.",
  "actions": [
    "create_asana_task",
    "send_email_summary"
  ],
  "sources": [
    "gmail",
    "asana",
    "hubspot",
    "google_analytics",
    "google_ads"
  ]
}
```

## Recommended n8n workflow shape

1. Webhook trigger
2. Auth check
3. Session lookup / memory lookup
4. Tool fan-out
5. Claude decision node
6. Optional action execution
7. JSON response

## Recommended tools in n8n

- Gmail or IMAP for inbox summaries
- Asana for tasks and project status
- HubSpot for deals, leads and notes
- Google Analytics for traffic and conversion reporting
- Google Ads for campaign metrics
- Optional TTS/STT only if you want voice handled server-side instead of browser-side
