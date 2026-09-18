# Hult Prize at the University of Windsor

React + TypeScript + Vite chapter website, configured for Vercel.
Intended domain: **hultprizeatuwindsor.ca**.

## Pages

Home (`/`), About (`/about`), Year One (`/year-one`), This Year (`/this-year`), Events (`/events`), Compete (`/compete`), Partners (`/partners`), Contact (`/contact`). Events also have individual `/events/:slug` pages.

`/team` redirects to the About team section. `/go` and the legacy `/#signup` point to the interest form on Compete. Every primary Register button opens official registration at `https://www.hultprize.org/register`.

## Development

```sh
npm install
npm run dev
npm run build
npm run lint
```

With Vite running, run `node scripts/check-site.mjs` for browser checks. Use `PLAYWRIGHT_CHANNEL=chrome` if using installed Google Chrome instead of Playwright's browser.

## Content

- `src/data/copy.json`: finished copy from the build brief.
- `src/data/site.ts`: domain, email, social and registration links.
- `src/data/posts.ts`: event/story entries and publication state.
- `src/data/partners.ts`: returning and confirmed partners.
- `src/data/assets.ts`: approved Year One photos and PDF download paths, currently pending.

See [launch notes](docs/launch-notes.md) for outstanding assets, editorial decisions, and deployment steps.

## Form and confirmation email

The only form is the student interest sign-up on Compete. It posts to the Google Apps Script Web App in `google-apps-script/Code.gs`, which saves a row in Google Sheets and emails next steps. Set the Web App URL as `VITE_FORM_ENDPOINT` locally or in Vercel. Redeploy Apps Script separately when its code changes and authorize its MailApp scope.

## Deployment and domain

The previous setup was documented as Vercel connected to GitHub with automatic deployment on pushes to `main`, with DNS managed through GoDaddy. Connect and verify `hultprizeatuwindsor.ca` in Vercel and the domain account; changing the repository does not change DNS.

## Printed QR code

The stable printed link is `https://hultprizeatuwindsor.ca/go`. Vercel redirects it to `/compete#signup`.

```sh
node scripts/generate-qr.mjs https://hultprizeatuwindsor.ca/go
```

SVG and PNG outputs are in `qr-code/`.
