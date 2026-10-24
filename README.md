# Hult Prize at the University of Windsor

React + TypeScript + Vite chapter website, configured for Vercel.
Intended domain: **hultprizeuwindsor.ca**.

## Pages

Home (`/`), About (`/about`), Year One (`/year-one`), This Year (`/this-year`), Events (`/events`), Compete (`/compete`), Partners (`/partners`), Contact (`/contact`), Attend our events (`/attend`), Manage attendance (`/attend/manage`) and the private Organiser dashboard (`/organiser/events`). Events also have individual `/events/:slug` pages.

`/team` redirects to the About team section. `/go` and the legacy `/#signup` point to the interest form on Compete. Competition entry links open `https://www.hultprize.org/register`; event attendance links open `/attend`, with event-specific preselection.

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
- `src/data/posts.ts`: competition/story entries and publication state.
- `shared/attendance-events.json`: event installation defaults; live events come from the attendance API and are editable in the organiser dashboard.
- `src/data/partners.ts`: returning and confirmed partners.
- `src/data/assets.ts`: approved Year One photos and PDF download paths, currently pending.

See [launch notes](docs/launch-notes.md) for outstanding assets, editorial decisions, and deployment steps.

## Form and confirmation email

Interest and enquiry forms use the server proxy `/api/forms` and the separate `google-apps-script/Code.gs` deployment. Set server-only `FORM_ENDPOINT` and `FORM_SHARED_SECRET`; see [form setup](docs/forms.md). Do not expose deployment secrets with a `VITE_` prefix.

Event attendance uses `/api/attendance` and a dedicated `google-apps-script/Attendance.gs` deployment/spreadsheet. It persists attendees, registrations, consent, delivery records and check-ins, and supports waitlists, secure management links and organiser reporting. Without the backend configuration, the UI clearly disables submission.

See [attendance deployment](docs/event-registration.md), [organiser guide](docs/organiser-attendance-guide.md) and [validation report](docs/event-registration-validation.md). Apps Script code and triggers must be deployed separately from Vercel.

## Deployment and domain

The previous setup was documented as Vercel connected to GitHub with automatic deployment on pushes to `main`, with DNS managed through GoDaddy. Connect and verify `hultprizeuwindsor.ca` in Vercel and the domain account; changing the repository does not change DNS.

## Printed QR code

The stable printed link is `https://hultprizeuwindsor.ca/go`. Vercel redirects it to `/compete#signup`.

```sh
node scripts/generate-qr.mjs https://hultprizeuwindsor.ca/go
```

SVG and PNG outputs are in `qr-code/`.
