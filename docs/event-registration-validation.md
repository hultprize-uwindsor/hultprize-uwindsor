# Event registration validation

Validated locally on October 22, 2026. The implementation is complete in the working tree; **it has not been deployed to hultprizeuwindsor.ca**. No production spreadsheet was accessed and no live registrant received email. Browser registration requests were intercepted with synthetic data; backend storage and MailApp were simulated in a VM.

## Checks completed

- `npm run build`: passes TypeScript and production Vite build, including static metadata for 27 routes. Vite reports a non-blocking JavaScript bundle-size warning (approximately 543 kB before gzip).
- `npm run test:attendance`: passes seed consistency, proxy validation/authentication, storage and workflow checks.
- `node scripts/check-attendance-ui.mjs`: passes public form, confirmation, management and accessibility interaction checks.
- `node scripts/check-attendance-admin-ui.mjs`: passes organiser workflow, reporting, permissions, export and date-editing checks.
- `node scripts/check-event-timeline.mjs`: passes shared schedule, changed administrator venue/time, ten chronological event links, and 320/1440px layout checks.
- `node scripts/check-forms.mjs` and `node scripts/check-confirmation.mjs`: existing interest/enquiry server and Apps Script regression checks pass.
- Focused lint on added frontend/backend code and `git diff --check`: pass.
- Additional real-page rendering checks passed for the homepage, unconfigured registration form and organiser sign-in at 320/390px. A long contact email overflow found at 320px was corrected and the failing check passed on rerun.
- Registration form and dashboard screenshots inspected at desktop and mobile sizes; no observed clipping or page-level overflow. Browser accessibility checks cover native labelled controls, keyboard operation, live status/errors, visible focus and reduced-motion behaviour; a manual screen-reader audit has not been performed.

Playwright on this workstation used its installed Chromium executable through `PLAYWRIGHT_EXECUTABLE_PATH`. The local Vite server and browser required permission to run outside the filesystem sandbox. These permissions did not permit live registration/email tests.

## Brief acceptance checks

| # | Requirement | Evidence / result |
| --- | --- | --- |
| 1 | Student registers for multiple events | Browser verifies student-specific validation and multi-event payload; storage test persists one attendee and separate registrations. |
| 2 | Sponsor without student-only fields | Browser verifies organisation requirement and hidden student fields; backend validates the sponsor category. |
| 3 | Safe team sharing | Shared link includes only chosen event IDs and optional team name; test checks no attendee email/name leakage. |
| 4 | No repeat duplicates | Normalized email lookup plus serialized attendee/event uniqueness; repeat public submission reveals no prior registrations or support details. |
| 5 | Full event plus open events | Backend and UI test one waitlist place alongside confirmed selections and show each status separately. |
| 6 | Capacity under competing requests | Twelve simulated competing submissions preserve configured capacity; held-lock request is rejected safely. Late walk-in capacity is also tested. Actual parallel requests to a deployed Google script remain a staging check. |
| 7 | Correct confirmation content | Fake MailApp captures current event dates, local times, full venues and statuses. No real sending account or inbox delivery has been verified. |
| 8 | November DST | Oct 29 4:30 PM = 20:30 UTC; Nov 16 4:30 PM = 21:30 UTC. Admin date entry tested from a Tokyo browser timezone; nonexistent/repeated DST hours are rejected. |
| 9 | Secure changes and cancellation | Hash-only expiring single-use email tokens; signed HttpOnly cookies; expired/tampered/foreign-attendee requests rejected. UI tests cancel one event, add another, edit support details and sign out. |
| 10 | Cancelled attendee reminders | Reminder delivery checks current registration/event status. Tests suppress cancelled and obsolete reminders, including event rescheduling. |
| 11 | Calendar consistency | Google Calendar parameters and downloaded ICS use the same UTC schedule and full venue; tested on both sides of DST. |
| 12 | Roster export and check-in | Organiser tests export filtered event/multi-event rosters, escape formula-leading cells, exclude restricted support information by default and record check-ins once. |
| 13 | People vs registrations vs actual attendance | UI fixture demonstrates two people, three event registrations and one check-in. Filters preserve distinct counts; category values drive student reporting. |
| 14 | Mobile, keyboard, reduced motion | Form tested at 320/375px, dashboard at 390px, schedule at 320/1440px; keyboard checkbox activation and zero reduced-motion transitions verified. |
| 15 | Competition entry remains separate | Form, confirmation and calendar explain separate competition entry and November 20 deadline; the official URL is preserved. Finale and dress rehearsal do not reserve pitch slots. |
| 16 | No test emails to live people | All automated tests use fake services/intercepted requests. Production code defaults email to disabled and supports an explicit staging recipient allowlist. |

Additional tests cover recovery after partial multi-table persistence, hashed rate limits including repeated failed organiser login, FIFO expiring seat offers and reserved capacity, fresh management links after single-use consumption, email failure/retry without duplicate registration, role-restricted support details, blocked email visibility, support-detail expiry and anonymised reports after retention.

The Discord launch input is resolved: the user supplied the approved invite https://discord.gg/ybeQYQxcqZ. It is the default in `SITE.discordUrl` and attendance emails. `ATTENDANCE_DISCORD_URL` remains an optional email override; no Discord configuration is required to use the approved default. Existing Signal destinations remain intact.

## Remaining launch inputs and external checks

1. **Attendance backend**: create/deploy the dedicated Apps Script project, configure its spreadsheet, run `setupAttendance()` and `installAttendanceTriggers()`, and authorise spreadsheet, mail and trigger scopes. No deployed attendance endpoint or spreadsheet connection was available in this workspace.
2. **Server configuration**: set `ATTENDANCE_ENDPOINT`, `ATTENDANCE_SHARED_SECRET` (32+ characters), `ATTENDANCE_SESSION_SECRET` (32+), `ATTENDANCE_ADMIN_PASSWORD` (16+) and a separate `ATTENDANCE_SUPPORT_PASSWORD` (16+, only for authorised support organisers). None was present in the inspected process environment; no local environment file was present. Store actual credentials in Vercel/Apps Script configuration, never source control.
3. **Sender and delivery**: set script `ATTENDANCE_EMAIL_MODE=test`, an explicit `ATTENDANCE_TEST_EMAILS` allowlist and the reply-to address. Run staging inbox, token link, trigger, quota and actual concurrent-capacity checks. Enable `live` in the production script after verification. MailApp records accepted sends/provider errors; it does not provide a delivered-to-inbox/bounce webhook or exactly-once send guarantee.
4. **Venue capacities**: confirm limits if desired, then enter them centrally. All ten defaults deliberately remain unset; the form displays no invented remaining-seat counts.
5. **Privacy and assets**: organisers need to review the new event-registration privacy notice and retention approach because there was no suitable existing policy. No approved CBNA/OMA/CSS/FRCT logos were present in the inspected assets; their exact supplied names appear in copy, and existing official Hult/UWindsor branding is reused.
6. **Publication**: deploy through the existing Vercel/GitHub workflow after backend setup. Source changes and a passing build alone do not activate registrations, MailApp or scheduled reminders. The unconfigured UI remains visibly unavailable and cannot display a fake successful submission.

See [deployment instructions](event-registration.md), [organiser guide](organiser-attendance-guide.md) and [email templates](event-email-templates.md).
