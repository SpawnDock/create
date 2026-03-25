# SpawnDock TMA Knowledge API

Use this endpoint when you need Telegram Mini App or SpawnDock-specific implementation guidance:

```bash
curl -X POST \
  'https://spawn-dock.w3voice.net/knowledge/api/v1/search' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "How do I use MainButton in a Telegram Mini App?",
    "locale": "en"
  }'
```

## Request

- Method: `POST`
- URL: `https://spawn-dock.w3voice.net/knowledge/api/v1/search`
- Content-Type: `application/json`
- Body fields:
  - `query` string, required
  - `locale` string, optional in practice for the script, default `en`

## Observed response shape

```json
{
  "answer": "Human-readable answer",
  "sources": [],
  "meta": {
    "locale_requested": "en"
  }
}
```

## Notes

- The skill defaults to `locale=en`.
- `Authorization: Bearer <API_TOKEN>` is optional and enables the higher-tier limits when the token is valid.
- SpawnDock bootstrap can write that token into `spawndock.config.json` as `apiToken` and into `.env.local` as `SPAWNDOCK_API_TOKEN`.
- The API can return an empty `sources` array.
- Use the answer as TMA-specific guidance, then inspect `sources` when present.
- The endpoint can return `429 rate_limit exceeded (minute)` after a small number of requests on the free tier.
