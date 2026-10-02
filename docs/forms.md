# Website form delivery

The interest form and contact enquiry form submit to the website’s `/api/forms` endpoint. A success message requires a readable receipt confirming that the response was saved in the existing Google Sheet. A failed, unreadable, or timed-out upstream response remains an error in the browser. The user can retry without appending another row for the same request.

The API runs as a Vercel Node function in production and as Vite middleware during local development and preview. No additional paid service or dependency was introduced. No real submissions, Google Sheet writes, or emails were sent during development checks.

## Configure delivery

1. Update the existing Apps Script project with `google-apps-script/Code.gs`. Preserve the existing spreadsheet ID unless intentionally moving the response store.
2. Run `setupSheet` in the script editor. It keeps existing rows and the seven original signup columns, adds request and notification columns, and creates the `Enquiries` tab.
3. Generate a random secret of at least 32 characters. Add it as `FORM_SHARED_SECRET` in Apps Script project properties. The same value belongs in the website’s server environment.
4. Deploy a new version of the existing Apps Script web app, executing as its owner with Anyone access. Authorize spreadsheet and mail access when Google requests it.
5. Add `FORM_ENDPOINT` (the deployment URL ending in `/exec`) and `FORM_SHARED_SECRET` to Vercel’s environment configuration. For localhost, use an ignored `.env.local` file with the same keys and restart Vite. `.env.example` shows the names without values.
6. Remove the old `VITE_FORM_ENDPOINT` setting. The Apps Script URL and shared secret must never be exposed through a `VITE_` variable or client code.
7. After deploying, make an intentional real test submission and verify its saved row and email. That external delivery test was not performed during the build.

Without configuration, the forms display an honest unavailable message and a direct email link. A static-only host without the API cannot deliver these forms; the direct email links still work.

## Storage and notifications

Signups retain their name, email, program, year, phone, and team status. The existing confirmation email retains official Hult registration and both Signal chat links. Enquiries save name, email, topic, and message in the `Enquiries` tab and notify `hultprizeatuwindsor@gmail.com`, with the visitor’s email as Reply-To.

Saving the row is authoritative. A mail-service error does not discard a saved response. The `Notification Sent` column stays blank if notification fails, so the team can find and follow up on those rows. A retry using the same request ID attempts a pending notification without adding another row. A rare interruption between sending mail and marking the column can repeat an email, but does not duplicate the response.

The browser keeps a request ID for the current form attempt. Retrying unchanged details reuses it; changed details receive a new ID. Apps Script serializes writes with a script lock, checks saved IDs, and rejects an ID reused with different content. This prevents duplicates caused by a lost response; it intentionally does not merge separate entries across browser refreshes or devices.

## Validation and limits

Both server layers validate allowed actions, field lengths, email format, topics and signup choices. They reject the honeypot field. The proxy accepts same-origin JSON requests only, restricts its upstream destination to Apps Script, limits body size, and throttles eight attempts per address per ten minutes per process. Apps Script additionally limits six new submissions per email and action in ten minutes. These best-effort limits use process memory and Apps Script cache; they are not a distributed abuse-prevention service.

User text is escaped before storage when it could be interpreted as a spreadsheet formula. Failure responses do not expose upstream URLs, keys, personal information, or internal exception details. The API uses `Cache-Control: no-store`.

## Verification

- `node scripts/check-forms.mjs` checks API validation, origin restrictions, configuration errors, response verification, throttling and both request-body formats with a mocked upstream.
- `node scripts/check-confirmation.mjs` checks Apps Script persistence, preserved confirmation links, authentication, idempotency, locks, notification retries, enquiries and formula escaping with mocked Google services.
- `node scripts/check-form-ui.mjs` runs browser checks against local Vite with intercepted form requests. It verifies validation, truthful failure messages, retry IDs and confirmed success for both forms. Set `PLAYWRIGHT_EXECUTABLE_PATH` when using a separately installed Chromium binary.
- `npm run build` checks TypeScript and the production frontend bundle. The build does not deploy Apps Script or test real mail delivery.

The deployment follows [Vercel’s Node function documentation](https://vercel.com/docs/functions/runtimes/node-js). Script deployment and write locking follow Google’s [web app guide](https://developers.google.com/apps-script/guides/web) and [LockService reference](https://developers.google.com/apps-script/reference/lock/lock-service).
