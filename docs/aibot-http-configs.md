# AIBot HTTP Configs

Níže jsou konkrétní konfigurace pro n8n `HTTP Request` nodes.

## 1. HubSpot recent leads

### Node
- `HTTP Request`

### Method
- `POST`

### URL
- `https://api.hubapi.com/crm/v3/objects/contacts/search`

### Headers
```json
{
  "Authorization": "Bearer {{$env.HUBSPOT_PRIVATE_APP_TOKEN}}",
  "Content-Type": "application/json"
}
```

### Body
```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "createdate",
          "operator": "GTE",
          "value": "={{$json.sinceIso}}"
        }
      ]
    }
  ],
  "properties": [
    "firstname",
    "lastname",
    "email",
    "createdate",
    "lifecyclestage",
    "hs_lead_status"
  ],
  "limit": 20,
  "sorts": [
    "-createdate"
  ]
}
```

## 2. HubSpot open deals

### URL
- `https://api.hubapi.com/crm/v3/objects/deals/search`

### Body
```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "dealstage",
          "operator": "NEQ",
          "value": "closedwon"
        },
        {
          "propertyName": "dealstage",
          "operator": "NEQ",
          "value": "closedlost"
        }
      ]
    }
  ],
  "properties": [
    "dealname",
    "amount",
    "dealstage",
    "pipeline",
    "closedate",
    "hs_lastmodifieddate"
  ],
  "limit": 20,
  "sorts": [
    "-hs_lastmodifieddate"
  ]
}
```

## 3. GA4 report

Použij `HTTP Request` nebo specializovaný GA4/community node. Pokud přes API:

### Method
- `POST`

### URL
- `https://analyticsdata.googleapis.com/v1beta/properties/{{$env.GA4_PROPERTY_ID}}:runReport`

### Headers
```json
{
  "Authorization": "Bearer {{$json.googleAccessToken}}",
  "Content-Type": "application/json"
}
```

### Body
```json
{
  "dateRanges": [
    {
      "startDate": "yesterday",
      "endDate": "yesterday"
    }
  ],
  "dimensions": [
    { "name": "sessionDefaultChannelGroup" }
  ],
  "metrics": [
    { "name": "sessions" },
    { "name": "totalUsers" },
    { "name": "conversions" }
  ],
  "limit": 10
}
```

## 4. Google Ads campaign report

Google Ads API je citlivější na OAuth a customer context. Nejčistší je HTTP node s OAuth access tokenem.

### Method
- `POST`

### URL
- `https://googleads.googleapis.com/v19/customers/{{$env.GOOGLE_ADS_CUSTOMER_ID}}/googleAds:searchStream`

### Headers
```json
{
  "Authorization": "Bearer {{$json.googleAdsAccessToken}}",
  "developer-token": "{{$env.GOOGLE_ADS_DEVELOPER_TOKEN}}",
  "login-customer-id": "{{$env.GOOGLE_ADS_LOGIN_CUSTOMER_ID}}",
  "Content-Type": "application/json"
}
```

### Body
```json
{
  "query": "SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date DURING TODAY"
}
```

## 5. Gmail unread inbox

Pokud nepoužiješ Gmail node a chceš jít přes Google API:

### Method
- `GET`

### URL
- `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread newer_than:2d&maxResults=10`

### Headers
```json
{
  "Authorization": "Bearer {{$json.googleAccessToken}}"
}
```

Druhý node pak pro každý message ID:

- `GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{{$json.id}}`

## 6. Asana tasks

### Method
- `GET`

### URL
- `https://app.asana.com/api/1.0/tasks?assignee=me&workspace={{$env.ASANA_WORKSPACE_GID}}&completed_since=now&opt_fields=name,due_on,completed,permalink_url,memberships.section.name,projects.name`

### Headers
```json
{
  "Authorization": "Bearer {{$env.ASANA_PAT}}"
}
```

## Doporučený pattern

1. `HTTP Request`
2. `Code -> compact summary`
3. `Merge` nebo `Code -> build externalContext`
4. `Claude`

To je lepší než cpát syrové API odpovědi rovnou do promptu.
