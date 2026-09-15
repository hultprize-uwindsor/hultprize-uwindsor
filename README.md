# Hult Prize at University of Windsor — Sign-Up Site

Two-page, mobile-first sign-up site for the UWindsor Hult Prize chapter.
Built with React + TypeScript + Vite, deployed on Vercel.

## Pages

- `/` — What the Hult Prize is, what you win, key dates, sign-up form, contact
- `/team` — Team headshots, roles, and bios
- `/go` — Short-link redirect used on printed materials (QR code target)

## Local development

```bash
npm install
npm run dev
```

## Form submissions

The sign-up form posts to a Google Apps Script Web App that appends each
submission as a row in a Google Sheet. See `google-apps-script/Code.gs` for
the script and setup steps. Once deployed, set the Web App URL as
`VITE_FORM_ENDPOINT` (see `.env.example`) — in Vercel this is a Project
Environment Variable.

## QR code / short link

Printed materials point at `https://hultprizeuwindsor.ca/go`, which redirects
to the sign-up form (configured in `vercel.json`). This keeps the printed QR
code stable even if the destination changes later — just update the redirect
and redeploy.

Regenerate the QR files (SVG + PNG) with:

```bash
node scripts/generate-qr.mjs https://hultprizeuwindsor.ca/go
```

Output lands in `qr-code/`.

## Deployment

- **Hosting:** Vercel, imported from this GitHub repo (auto-deploys on push
  to `main`).
- **Domain:** `hultprizeuwindsor.ca`, connected via GoDaddy DNS pointing at
  Vercel.
- **Environment variable:** `VITE_FORM_ENDPOINT` must be set in Vercel
  Project Settings for the sign-up form to work in production.
