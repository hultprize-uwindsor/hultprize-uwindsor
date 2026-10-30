# Event attendance: deployment and operation

This extends the existing React/TypeScript/Vite site and Vercel Node API. Attendance uses a **separate Google Apps Script deployment and Google spreadsheet**, reusing the current Google Sheets/MailApp architecture without mixing competition interest submissions into attendance headcounts. No new browser credentials or hosted database vendor is required.

## Application routes

- `/attend`: individual registration for one or more events.
- `/attend?events=workshop-1,workshop-2`: preselected events. An optional `team` query value can carry a team/organisation name, never the original attendee's contact details.
- `/attend/manage`: request a secure email link, view attendance, add events, cancel individual events, update support needs and accept offered seats.
- `/organiser/events`: private dashboard, operational exports, check-in, walk-ins, event editing and email delivery review.
- `/privacy`: event-registration privacy notice. The repository had no suitable existing privacy policy; organisers must review this notice and retention schedule before launch.

Competition entry remains at https://www.hultprize.org/register with the November 20, 2026 deadline. Event attendance does not grant a pitching slot, a practice pitch slot, judge verification or administrative access.

## Data and schedule

`shared/attendance-events.json` contains the ten approved events as installation defaults, UTC timestamps and `America/Toronto`. Capacity is `null` for every event: no venue capacity or planned attendance number has been invented. Oct 29 at 4:30 PM is 20:30 UTC (EDT); Nov 16 at 4:30 PM is 21:30 UTC (EST).

After installation, the Events table is the live source for both the form and website timeline. Edit events through the organiser dashboard. Source defaults are only a labelled reference schedule when the service is unavailable; submission is disabled until the live service responds. Updating a default JSON file does not overwrite administrator edits in a running spreadsheet. After changing installation defaults, run `node scripts/sync-attendance-seed.mjs`; validate with `--check`.

The dedicated store includes attendees, events, event registrations, consent records, deliveries, check-ins, hashed expiring tokens, rate limits and a transaction journal. All registration mutations serialize through a script lock. The journal permits recovery after a partial multi-table write; every request recovers pending work before reading or allocating seats. The application enforces one normalized email per attendee and one attendee/event registration. **Do not directly edit, sort, delete or add storage rows**, or run another writable deployment against the same spreadsheet: those bypass application invariants. Keep spreadsheet sharing limited to the deployment owner and trusted operational administrators.

## Before production deployment

1. Create the dedicated attendance spreadsheet and Apps Script project under an organiser-controlled account. Use `google-apps-script/Attendance.gs`, separately from the existing `Code.gs` interest/enquiry script. Set `ATTENDANCE_SHARED_SECRET` (32+ random characters), optional `ATTENDANCE_SHEET_ID` (otherwise setup creates one), `ATTENDANCE_SITE_URL`, `ATTENDANCE_REPLY_TO` and optional `ATTENDANCE_DISCORD_URL` in script properties. Copy `google-apps-script/attendance-appsscript.json` to that project’s `appsscript.json` manifest (enable manifest visibility in project settings); it sets `America/Toronto`, V8 and the required spreadsheet/mail/trigger scopes. Do not replace the legacy interest-form manifest.
2. Generate independent random secrets using a password manager. Put the shared secret in both Apps Script properties and Vercel, and set the attendance spreadsheet ID in script properties. Set the public site origin to `https://hultprizeuwindsor.ca`. Authorise spreadsheet access and MailApp for the deployment account.
3. Run `setupAttendance()` to install tables and seed events, then `installAttendanceTriggers()` to schedule `attendanceMaintenance` every five minutes. Run this first against an isolated staging spreadsheet. Email is disabled by default: set `ATTENDANCE_EMAIL_MODE=test` and `ATTENDANCE_TEST_EMAILS` to a comma-separated list of your test inboxes. All other recipients are blocked. Set `ATTENDANCE_EMAIL_MODE=live` only in the production script after validation.
4. Deploy the script as a web app executing as its owner. The endpoint accepts requests only with the shared server secret; the URL and secret must never be placed in client code. Copy the deployment `/exec` URL to Vercel's `ATTENDANCE_ENDPOINT`.
5. Set these **server-only** Vercel variables: `ATTENDANCE_ENDPOINT`, `ATTENDANCE_SHARED_SECRET`, `ATTENDANCE_SESSION_SECRET`, `ATTENDANCE_ADMIN_PASSWORD`, and (only for organisers who need support information) `ATTENDANCE_SUPPORT_PASSWORD`. Use distinct admin/support passwords (at least 16 characters each) and a random session secret (at least 32 characters). See `.env.example`; local development reads `.env.local`. Never prefix these with `VITE_`.
6. The approved Discord invite, https://discord.gg/ybeQYQxcqZ, is the default in `SITE.discordUrl` and attendance emails. `ATTENDANCE_DISCORD_URL` is an optional script-property override for email links; leave it unset to use the approved default. Keep the website and email destinations aligned if the invite changes. CBNA, OMA, CSS and FRCT are named as supplied; no unapproved expanded names or logos have been created.
7. Configure capacities only after confirming them with venues. Review all dates, times, locations, the privacy notice, authorised organisers and the sending account's quotas. Keep the staging recipient restriction enabled until staging validation is complete.
8. Run the validation commands below. Deploy the website through its existing Vercel/GitHub process only after backend setup. A repository build does not deploy Apps Script, configure the spreadsheet, authorise MailApp or install triggers.

Google documents [web app deployment](https://developers.google.com/apps-script/guides/web), [script locks](https://developers.google.com/apps-script/reference/lock/lock-service), [installable triggers](https://developers.google.com/apps-script/guides/triggers/installable) and [service quotas](https://developers.google.com/apps-script/guides/services/quotas). This architecture suits the chapter's existing setup; sending limits and script execution limits still apply. Failed emails retain the registration and are visible for retry. Google MailApp accepting a send is not a guarantee of inbox delivery or a bounce webhook. MailApp has no idempotency key; a process failure between sending a message and recording the successful send may result in a duplicate email on retry, but cannot create a duplicate registration.

Email wording is documented in [email templates](event-email-templates.md). The follow-up emails (thank-you cards and missed-you letters) load their pictures from the website, so deploy the site before pasting a new `Attendance.gs`. After pasting, save the project (triggers run the saved code) and create a new web app deployment version. Then run `sendFollowUpTest()` to check them in your own inbox, and set `ATTENDANCE_FOLLOW_UP_MODE=auto` to send them automatically.

## Security and privacy operations

Management links expire and store only protected token material. Tokens travel in URL fragments and are removed from the address bar before exchange; authenticated mutations use same-origin requests and protected cookies. An unverified repeat submission never returns someone else's registrations or changes their details: it directs them to email verification. Category selection grants no privileges.

Organiser sessions are separate from attendee sessions. The support organiser role can see dietary and accessibility requests; ordinary organisers cannot. General CSV exports exclude those fields and escape formula-leading cells. A shared organiser password is suitable only for a small trusted team: rotate it when access changes, rotate the session secret to invalidate active sessions, and restrict access to the underlying Google project. There is no claim of per-person SSO or individual audit attribution.

Required operational acknowledgement and optional broader-update consent are recorded separately with their wording/version. Optional consent starts unticked. This release does not send marketing campaigns or export partner contact lists. The roster is for event operations, not sponsor marketing.

Retention: support details are removed 30 days after an attendee's last registered event. Identifiable attendance records are removed 12 months after the season's final event; aggregate counts may be retained. The maintenance job handles stored records; organisers must also remove downloaded CSVs, spreadsheet backups/revisions where applicable and any external operational copies under the same retention schedule. Review Google Drive retention/version-history controls rather than assuming deleting an application row removes every historical copy.

## Validation

```sh
npm run build
node scripts/check-attendance.mjs
node scripts/check-forms.mjs
node scripts/check-confirmation.mjs
# With local Vite running:
node scripts/check-attendance-ui.mjs
node scripts/check-attendance-admin-ui.mjs
node scripts/check-event-timeline.mjs
```

Tests use isolated fake services and intercepted browser API calls. They do not send emails to live registrants. See `docs/event-registration-validation.md` for the actual results and remaining production checks.
