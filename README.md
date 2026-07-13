# Snip Backend

Tiny URL shortener backend built with Bun in a single file and zero npm dependencies.

## Run

```bash
bun run server.js
```

Or via npm scripts:

```bash
bun run start
```

## Environment

- `PORT`: server port (default `3000`)
- `BASE_URL`: origin used when returning `shortUrl`
- `RAILWAY_PUBLIC_DOMAIN`: fallback origin becomes `https://$RAILWAY_PUBLIC_DOMAIN` when `BASE_URL` is not set
- `PUBLIC_DIR` (optional): folder to serve static files from. `/` serves `index.html`.

## API

- `POST /api/links` with body `{ "url": "https://example.com" }`
  - `201` returns `{ code, url, shortUrl, hits, createdAt }`
  - `400` for invalid JSON or non-http(s) URL
- `GET /api/links`
  - `200` returns all links
- `GET /:code`
  - `302` redirects to original URL and increments hits
  - `404` if unknown code
