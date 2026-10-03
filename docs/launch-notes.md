# Launch handoff

The Jeton-inspired rebuild covers all 13 published routes and the 404 page. Hult and UWindsor logos, pink and navy, competition facts, and contact destinations remain. Preview locally at `http://127.0.0.1:5173` with `npm run dev -- --host 127.0.0.1`. Local development, font files and the coin animation require no paid service.

## Design and interactions

- Large, light typography, full-width pink page headers, rounded white content surfaces and responsive editorial layouts replace the previous Quartr treatment.
- The desktop navigation stays at the bottom, with 600ms rising menu panels. On mobile, a fixed Menu button opens a full-screen native dialog with an 800ms layered wipe. Drawers slide in from the right on desktop and from below on mobile, with animated exits. Escape, keyboard navigation, focus management and footer accordions are supported.
- The home page uses original WebGL disc artwork with a 13.35-second folding loop and a static CSS fallback. A pinned introduction shrinks its headline, gathers five cards into a stack, then brings in Build/Pitch/Compete. The “From idea to impact” journey pairs Build/Pitch/Compete with six event photos, crossfading every 3.5 seconds with a gentle zoom. Its shared pause control, previous/next photo buttons and keyboard tabs work in both autoplay and manual modes; playback stops offscreen and for reduced motion. Section four, “Your idea. Room to grow.”, is a static text section on a plain navy background with registration and programme links. Lenis provides eased desktop scrolling; touch scrolling stays native. Hero titles use native text shaping and a whole-heading entrance, with no word or character masks. Section headings retain character reveals, with their masks removed once the entrance finishes. Button labels roll on hover or keyboard focus throughout the site. Continuous animation stops offscreen and responds to reduced-motion preferences. The hero has no visible pause control; the journey retains its playback controls.
- The global prize section leads with a bold $1M USD headline and short seed-funding copy. Original gold dollar coins fall when that headline enters view and settle at the base. The shower works on desktop and mobile, pauses offscreen, replays on re-entry, and becomes still for reduced motion. The prize terms link to Hult Prize. There is no currency converter or exchange-rate request.
- The former Year One book is now a photo gallery. The former team tree is now a portrait grid. Team biographies, gallery photos, partner stories and enquiries open in accessible drawers. Their query URLs support direct access; closing restores the page and trigger focus.
- Every route retains the bottom-right scroll-to-top button. Browser back restores scroll position. `/team`, `/go` and `/#signup` still resolve; printed QR assets use `https://hultprizeuwindsor.ca/go`.
- Inter is self-hosted under its SIL Open Font License (`public/fonts/INTER-LICENSE.txt`). The retired EF Circular files are excluded from production assets. Jeton’s proprietary font, artwork and source code are not bundled.

## Content

The season runs October 1, 2026–April 11, 2027. Five workshops run November 7–January 9; registration closes November 20; touch base is January 2; Grand Finale is February 5; Uwill Discover is March 13; Nationals in Calgary are April 10–11. Up to three teams can represent UWindsor at Nationals, with nine weeks to prepare after the Grand Finale. Campus prizes are $1,000, $500 and $250 CAD; the global prize is US$1 million in seed funding.

The owner’s headings remain: “Where we started”, “Our goals”, “Mark Your Calendars” and “The Team”. Fusion welcomes students from every institution. Published past events are labelled as past events. Workshop and Grand Finale posts remain drafts until session times and locations are confirmed.

## Forms and deployment

1. Configure server-only `FORM_ENDPOINT` and `FORM_SHARED_SECRET` in Vercel; remove the retired `VITE_FORM_ENDPOINT` setting. See [form delivery setup](forms.md).
2. Redeploy `google-apps-script/Code.gs`, set its matching secret and authorize the script’s mail permissions. Signups retain confirmation emails and Signal links. Contact enquiries save separately and notify the team.
3. Build with `npm run build`. The metadata postbuild step creates route-specific HTML heads, branded social cards references, sitemap and robots files. This supports social unfurling; page content is still rendered by React, not server-rendered. Vercel routes known paths to their generated HTML and preserves `/api/forms`.
4. Verify the configured sheet and email delivery with an intentional live submission after deployment. Local checks use mocks and send no real email. Forms display success only after a verified saved receipt. Without configuration, they show an unavailable state and direct email link.
5. Connect the confirmed domain `hultprizeuwindsor.ca` and verify DNS in the domain account. Repository changes do not deploy the website or alter DNS.

## Existing content approvals and missing assets

- The owner requested past-event photos for the homepage journey gallery. The six selected exports are listed in `homeGalleryFiles` in `src/data/photo-permissions.json` and included in production. Selected image captions omit the unconfirmed event date. The wider `approvedForPublication` flag remains false: the other photo sections still appear only in local development, and production excludes the full-resolution original folder and the remaining exports. The original export mapping is in `docs/photo-selections.json`; older local captions provisionally use February 5, 2026 from camera metadata. Production uses the original brand artwork in other photo placements and omits the unpublished Year One gallery. Fusion-space, Nationals and award photos are still missing.
- Bobola Obi’s portrait and approved individual LinkedIn URLs are still missing. The seven available portraits appear as complete, uncropped cards in a three-column desktop, two-column tablet and one-column mobile grid. Accessible text and profile drawers retain the current roles where the artwork abbreviates them. The Startups Coordinator vacancy remains unpublished.
- The Supported by strip remains disabled via `SHOW_PARTNER_STRIP`. The three community partner pages use confirmed local assets and official site facts; partner review remains an editorial launch item.
- The Contact page retains the supplied 9am–4pm hours. Fusion publicly lists 8:30am–4:30pm; confirm whether the website’s hours refer to Hult staffing before public launch.
- Approved overview/proposal PDFs should be placed under `public/downloads/` and configured in `src/data/assets.ts`; unavailable downloads stay hidden.
- Winner quotes and consent from 100% Fish and Mycovolt are still needed for a testimonials section. No placeholder quotes are published.
- The combined UWindsor/EF Hult Prize logo remains as requested by the owner; institutional brand approval remains an existing launch item.

## Verification

Run `npm run build` and `npm run lint`. The browser scripts use a running local server and accept `CHECK_BASE_URL` and `PLAYWRIGHT_EXECUTABLE_PATH`:

- `node scripts/check-site.mjs`: all published pages and 404 at seven phone, tablet, landscape and desktop sizes from 320–1920px; images, headings, clipped text, reduced-motion visibility, overflow and browser errors. Use CHECK_VIEWPORTS and CHECK_PATHS for focused reruns.
- `node scripts/check-site-motion.mjs`: pinned scene visibility and card paths, smooth scrolling, drawers, history, gallery, timed journey controls and reduced motion. Set `CHECK_JOURNEY_ONLY=1` for focused journey-gallery playback, navigation, focus and mobile checks.
- `node scripts/check-brand-motion.mjs` and `node scripts/check-ui-motion.mjs`: WebGL animation, offscreen suspension and fallback states, menu and drawer transitions, focus, scroll locking and reduced motion.
- `node scripts/check-navigation.mjs` and `node scripts/check-links.mjs`: navigation behavior and real link activation, anchors, downloads, redirects and external tabs.
- `node scripts/check-prize.mjs`: the fixed USD headline, coin entry/re-entry, mobile motion, offscreen suspension, reduced motion and the absence of conversion controls or rate requests.
- `node scripts/check-form-ui.mjs`, `node scripts/check-forms.mjs` and `node scripts/check-confirmation.mjs`: mocked form UI, server proxy and Apps Script flows; no real sheet writes or mail.

The legacy book-specific script is retired with that component. `check-partner-motion.mjs` skips while the partner strip is disabled. Third-party links remain external destinations; local checks do not claim their future availability.
