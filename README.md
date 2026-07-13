# Snip CLI

Zero-dependency Node CLI for the Snip backend.

## Commands

- `snip add <url>`: create a short link and print `shortUrl`
- `snip ls`: list links as `code / hits / url`
- `snip open <code>`: resolve code via backend redirect and open target URL
- `snip help`: show usage

## Environment

- `SNIP_API`: backend base URL (default `http://localhost:3000`)

## Run locally

```bash
node cli.js help
```
