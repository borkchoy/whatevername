# Snip Monorepo Aggregator

Snip is one backend with two clients:
- Backend service (`backend`): tiny Bun URL shortener API
- Web client (`frontend`): Angular UI
- CLI client (`cli`): zero-dependency Node command line tool

This `main` branch is an aggregator that links those three branch-based projects as submodules.

## API Contract

| Method | Path | Request | Success | Error |
| --- | --- | --- | --- | --- |
| POST | `/api/links` | `{ "url": "https://..." }` | `201` `{ code, url, shortUrl, hits, createdAt }` | `400` `{ error }` for invalid input |
| GET | `/api/links` | none | `200` array of `{ code, url, shortUrl, hits, createdAt }` | non-`200` on backend failure |
| GET | `/:code` | none | `302` redirect to original URL (and increments hits) | `404` unknown code |

## Layout

- `backend/` submodule tracking branch `backend`
- `frontend/` submodule tracking branch `frontend`
- `cli/` submodule tracking branch `cli`
- `bundle/` submodule tracking branch `bundle` (generated release output)

Each layer is developed on its own branch, then pinned here by submodule commit pointers.

## Clone

Use recurse-submodules so folders are populated immediately:

```bash
git clone --recurse-submodules https://github.com/borkchoy/whatevername.git
```

Without `--recurse-submodules`, `backend/`, `frontend/`, and `cli/` will exist but be empty until initialized.

## Run All Three

Open three terminals from a `main` checkout:

```bash
cd backend && bun start
```

```bash
cd frontend && npm i && npx ng serve
```

```bash
cd cli && node cli.js ls
```

Expected flow: shorten a URL in the browser (`:4200`) against backend (`:3000`), then `cli.js ls` shows the same link.

## Update Workflow

1. Enter a submodule folder and make your change.
2. Commit and push from inside that submodule repository.
3. Return to this superproject and update pointer:

```bash
git submodule update --remote <path>
git add <path>
git commit -m "Bump <path> submodule"
```

4. Push `main` to share updated pinned revisions.

## Generated Bundle Branch

`bundle` is generated output for one-process deploys (API + UI). Do not hand-edit inside `bundle/`.

Generate or refresh it from `main`:

```bash
node scripts/build-bundle.mjs
```

Push updated bundle branch and superproject pointers:

```bash
node scripts/build-bundle.mjs --push
```
