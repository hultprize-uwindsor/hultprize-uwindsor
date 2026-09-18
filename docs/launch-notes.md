# Launch handoff

The supplied build brief names eight pages; all eight are implemented. Existing `/team`, `/go`, and `/#signup` links still work. `/go` now points to `/compete#signup`. Printed QR assets encode `https://hultprizeatuwindsor.ca/go`.

## Content and assets still needed

- A 1.5 GB folder of original event photos appeared during implementation at `public/images/local-event-photos-2026`. Eight selected web-sized copies now live in `public/images/year-one` and appear in the local development preview on Home, About, Year One, Compete, and Partners. Selection mapping is in `docs/photo-selections.json`. Camera metadata indicates February 5, 2026; captions use that date provisionally. Approval and event/date confirmation remain requested. `src/data/photo-permissions.json` controls production publication: it is false until confirmed, and the build excludes both original files and unapproved web exports. Original files are also excluded from Vercel uploads. National-site placeholder photos are no longer rendered. The Year One picture book shows all eight selected landscape images across facing pages, with introductory text on the left and the supplied 3D page-flip component on the right. Fusion-space photos, Nationals photos and the program award are still missing, so those subjects are not illustrated with unrelated event photos.
- Bobola Obi’s portrait and any approved individual LinkedIn URLs. The other seven portraits are reused; names and roles follow the new brief. The unfilled Startups Coordinator role is not advertised pending the user's decision.
- Partner logo files and usage guidelines. Current boxes intentionally show names, not substitute logos. Nine returning organisations appear in the strip; Mayor Drew Dilkens is listed by name in the Year One grid. Fusion, Sterling, and Hypercare are explicitly confirmed in the brief. EPICentre remains excluded because its row says to confirm the relationship, despite the closing checklist saying four current partners.
- Fusion’s official URL. Its placeholder currently links to the University of Windsor homepage rather than a guessed Fusion URL.
- Approved program overview and full partnership proposal PDFs. Place them under `public/downloads/` and set `DOWNLOADS` in `src/data/assets.ts`. Download links render only when a file is configured.
- Real dates, cover photos, and finished copy for Year One event stories. Drafts live in `src/data/posts.ts`. The supplied Fusion story is preserved in `docs/fusion-story-draft.txt`: confirm the person thanked, their consent, and the event having happened before publishing. No `[NAME]` placeholders appear publicly.
- Session times and locations for the bootcamp and Grand Finale posts. The known dates are already on This Year. These event posts stay unpublished until their details are complete. The registration-deadline post is published; filters appear automatically at six published posts.

## Design decisions

- Pink carries the hero and calls to action; Windsor blue carries links, eyebrows, statistics and the footer. No gold and no invented photography.
- Primary buttons use the requested white text on #FF329B. Labels are bold and at least 19px to meet the large-text contrast threshold; body links use #005596. Body copy is 16px or larger.
- The hero headline stays on a single line as explicitly requested. This requires a smaller headline on narrow phones; there are no manual line breaks.
- At the user’s request, About now shows the original full portrait cards with hover/tap biography overlays. Printed roles inside some original images differ from the newer roles in the captions; updated image files would resolve that. The header/footer display only the standalone Hult portion of the supplied multi-mark sheet. Existing biographies are restored in the overlays, with the funding target updated to the new brief.
- The supplied Contact copy describes Fusion as open; confirm this accurately reflects the launch date before deployment. The future-dated launch story stays unpublished.

## Deployment

1. Connect `hultprizeatuwindsor.ca` to the Vercel project and verify DNS in the domain account. The old README described `hultprizeuwindsor.ca`; repository edits do not alter DNS or Vercel domain configuration.
2. Set `VITE_FORM_ENDPOINT` in Vercel, then build and deploy.
3. Redeploy `google-apps-script/Code.gs` separately. It now sends a confirmation email after saving a valid sign-up, with the official registration link and both Signal chats. The script owner must authorize MailApp permissions. A mail failure is logged without dropping the saved sign-up.
4. Verify the live sheet and confirmation email with an intentional real submission after deployment. Local checks use mocks and send no emails.

The existing form uses Apps Script's cross-origin `no-cors` submission. A completed fetch cannot verify the server response; a live deployment check is still required.

## Verification

- `npm run build`
- `npm run lint`
- `node scripts/check-confirmation.mjs` (mocked Apps Script services; no real email)
- Start Vite, then `node scripts/check-site.mjs`. If only system Chrome is installed, use `PLAYWRIGHT_CHANNEL=chrome node scripts/check-site.mjs`.
- Browser checks exercise all eight pages at 375px and 1440px, footer destinations, official registration links, one-form placement, FAQ keyboard controls, mobile navigation, legacy redirects, unpublished content, image loading, and reduced motion. Screenshots go to `/tmp/hult-site-check`.

Partner URLs checked against official sites: [Sterling](https://www.sterlinginfo.com/), [Picsume](https://www.picsume.com/), [Student Centre](https://www.uwsa.ca/student-centre), [GSS](https://uwindsorgss.ca/), [Research and Innovation](https://www.uwindsor.ca/research/), [WEtech Alliance](https://www.wetech-alliance.com/), [Small Business and Entrepreneurship Centre](https://www.webusinesscentre.com/), and [Hypercare](https://www.hypercare.com/).

## Partner motion update

Partner cards on Home and Year One, plus the site-wide Supported by strip, now use the user-supplied ThreeDScrollTrigger motion. The passive scroll-velocity tracking, exponential damping, wrapping and skew are preserved in `src/components/ThreeDScrollTrigger.tsx`. CSS replaces the example’s Tailwind helpers. Hover, keyboard focus, explicit pause, reduced motion and offscreen suspension are supported. Clone links remain clickable but are excluded from keyboard and screen-reader navigation. The original static-grid requirement is superseded by this later request.

Motion checks: `PLAYWRIGHT_CHANNEL=chrome node scripts/check-partner-motion.mjs` with the local preview at port 5174.

## Year One picture book

Year One uses the user's supplied `ThreeDImagePageflip` component in `src/lightswind/ThreeDImagePageflip.tsx`. The page-turn implementation is preserved, with optional half-spread rendering and separate alt text added. Photo dimensions determine whether a photo spans two facing pages; photo text overlays are omitted. `YearOnePictureBook` supplies local photos, responsive dimensions and reduced-motion settings. The book starts with an open spread alongside the text and stacks below it on mobile. The earlier carousel remains available but is no longer used on this page.

## Site motion

`src/hooks/useSiteMotion.ts` applies once-only viewport reveals to selected headings, introductory copy and cards without adding layout wrappers. Page arrivals fade upward by 20px over 500ms; section reveals use 14px of movement over 480ms; card staggers are 60ms apart, capped at 180ms. The persistent footer wordmark reveals once. Dynamically rendered content is observed, and keyboard focus immediately reveals its containing card. Offscreen content is never removed from the accessibility tree.

`src/motion.css` supplies hover, FAQ and form-feedback transitions. Reduced-motion preferences disable new animations, including when the preference changes while the page is open. Book turns, partner motion, timeline entrances and selected count-ups keep their own implementations. The homepage statistic strip and headline “4 minutes” remain static. `scripts/check-site-motion.mjs` verifies viewport reveals, no replay, keyboard access, form/FAQ feedback, reduced motion and all eight pages at desktop/mobile widths.
