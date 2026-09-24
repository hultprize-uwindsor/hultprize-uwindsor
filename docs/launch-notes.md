# Launch handoff

The supplied build brief names eight pages; all eight are implemented. Existing `/team`, `/go`, and `/#signup` links still work. `/go` now points to `/compete#signup`. Printed QR assets encode `https://hultprizeuwindsor.ca/go`.

## Content and assets still needed

- A 1.5 GB folder of original event photos appeared during implementation at `public/images/local-event-photos-2026`. Eight selected web-sized copies now live in `public/images/year-one` and appear in the local development preview on Home, About, Year One, Compete, and Partners. Selection mapping is in `docs/photo-selections.json`. Camera metadata indicates February 5, 2026; captions use that date provisionally. Approval and event/date confirmation remain requested. `src/data/photo-permissions.json` controls production publication: it is false until confirmed, and the build excludes both original files and unapproved web exports. Original files are also excluded from Vercel uploads. National-site placeholder photos are no longer rendered. The Year One picture book shows all eight selected landscape images across facing pages, with introductory text on the left and the supplied 3D page-flip component on the right. Fusion-space photos, Nationals photos and the program award are still missing, so those subjects are not illustrated with unrelated event photos.
- Bobola Obi’s portrait and any approved individual LinkedIn URLs. The other seven portraits are reused; names and roles follow the new brief. The unfilled Startups Coordinator role is not advertised pending the user's decision.
- Partner logo files and usage guidelines. Current boxes intentionally show names, not substitute logos. Nine returning organisations appear in the strip; Mayor Drew Dilkens is listed by name in the Year One grid. Fusion, Sterling, and Hypercare are explicitly confirmed in the brief. EPICentre remains excluded because its row says to confirm the relationship, despite the closing checklist saying four current partners.
- Fusion’s official URL. Its placeholder currently links to the University of Windsor homepage rather than a guessed Fusion URL.
- A competition-day wide shot of the full room from the back, for Partners, What you get. None of the 86 originals is taken from the back of the room, so `room` (auditorium-conversations) stands in.
- Written permission to self-host EF Circular, or the files from the Hult Prize Marketing and Media library. `public/fonts/` holds byte-identical copies of ef.com's EF Circular VF subsets (© Lineto, with no licence grant in the files). The visual brief's fallback, Poppins, has a single-storey `a` while EF Circular's is double-storey, so choose any fallback by a side-by-side test.
- Student quotes and consent from 100% Fish and Mycovolt for a winners section. The visual brief rules out a carousel without real quotes; with two teams it would be a static card grid. The home page omits the section until then.
- UWindsor brand office confirmation for the header. At the owner's request the header keeps the combined UWindsor and EF Hult Prize image, which the visual brief says UWindsor's rules do not permit.
- Approved program overview and full partnership proposal PDFs. Place them under `public/downloads/` and set `DOWNLOADS` in `src/data/assets.ts`. Download links render only when a file is configured.
- Real dates, cover photos, and finished copy for Year One event stories. Drafts live in `src/data/posts.ts`. The supplied Fusion story is preserved in `docs/fusion-story-draft.txt`: confirm the person thanked, their consent, and the event having happened before publishing. No `[NAME]` placeholders appear publicly.
- Session times and locations for the bootcamp and Grand Finale posts. The known dates are already on This Year. These event posts stay unpublished until their details are complete. The registration-deadline post is published; filters appear automatically at six published posts.

## Design decisions

- The visual brief ("match hultprize.org, add UWindsor blue") was checked against the live national site first; where the two disagreed, the owner chose national's layout with the brief's colours. Layout follows hultprize.org: 1200px column, h1 56/64 and h2 48/56 (48/56 and 40/48 on phones), 16px card corners, pill buttons, a dark-blue band (the owner's choice over national's pink) with centred intro and white stat cards, a full-bleed photo, and a 6-2-2-2 footer. Colours follow the brief: pink for the hero gradient, primary buttons and fills; UWindsor blue for links, eyebrows and secondary buttons; dark blue for stat numerals and the footer; ink headlines. The brief's tokens live on `:root` in `src/index.css`.
- National's desktop hero is a video on #191919; ours keeps the brief's pink gradient because there is no approved footage.
- Primary buttons use white text on #FF329B. Labels are bold and at least 19px to meet the large-text contrast threshold, including the header Register. Body links are UWindsor blue and underlined, so colour is never the only cue.
- The home headline wraps on phones (40px), replacing the earlier single-line request, so it is never smaller than the text below it.
- Links out to hultprize.org sit in three places only: the header text link "Part of the global EF Hult Prize" (inside the menu on phones), every Register button, and the footer EF Hult Prize marks.
- At the user’s request, About now shows the original full portrait cards with hover/tap biography overlays. Printed roles inside some original images differ from the newer roles in the captions; updated image files would resolve that. The hover character layer uses EF Circular, not a monospace face, so the site keeps one typeface. Existing biographies are restored in the overlays, with the funding target updated to the new brief.
- The supplied Contact copy describes Fusion as open; confirm this accurately reflects the launch date before deployment. The future-dated launch story stays unpublished.

## Deployment

1. Connect `hultprizeuwindsor.ca` (the confirmed domain; an earlier draft used `hultprizeatuwindsor.ca` in error) to the Vercel project and verify DNS in the domain account. Repository edits do not alter DNS or Vercel domain configuration.
2. Set `VITE_FORM_ENDPOINT` in Vercel, then build and deploy.
3. Redeploy `google-apps-script/Code.gs` separately. It now sends a confirmation email after saving a valid sign-up, with the official registration link and both Signal chats. The script owner must authorize MailApp permissions. A mail failure is logged without dropping the saved sign-up.
4. Verify the live sheet and confirmation email with an intentional real submission after deployment. Local checks use mocks and send no emails.

The existing form uses Apps Script's cross-origin `no-cors` submission. A completed fetch cannot verify the server response; a live deployment check is still required.

## Verification

- `npm run build`
- `npm run lint`
- `node scripts/check-confirmation.mjs` (mocked Apps Script services; no real email)
- Start Vite, then `node scripts/check-site.mjs`. If only system Chrome is installed, use `PLAYWRIGHT_CHANNEL=chrome node scripts/check-site.mjs`. Set `CHECK_BASE_URL` to point the browser checks (site, site-motion, partner-motion, picture-book, event-timeline) at another port.
- Browser checks exercise all eight pages at 375px and 1440px, footer destinations, official registration links, one-form placement, FAQ keyboard controls, mobile navigation, legacy redirects, unpublished content, image loading, and reduced motion. Screenshots go to `/tmp/hult-site-check`.

Partner URLs checked against official sites: [Sterling](https://www.sterlinginfo.com/), [Picsume](https://www.picsume.com/), [Student Centre](https://www.uwsa.ca/student-centre), [GSS](https://uwindsorgss.ca/), [Research and Innovation](https://www.uwindsor.ca/research/), [WEtech Alliance](https://www.wetech-alliance.com/), [Small Business and Entrepreneurship Centre](https://www.webusinesscentre.com/), and [Hypercare](https://www.hypercare.com/).

## Partner motion update

**Hidden for now.** At the owner's request the Supported by strip is not shown on any page. Set `SHOW_PARTNER_STRIP` to `true` in `src/data/partners.ts` to bring it back; everything below still applies when it returns. `scripts/check-partner-motion.mjs` skips itself while the strip is hidden.

The site-wide Supported by strip uses the user-supplied ThreeDScrollTrigger motion, kept at the owner's request although hultprize.org has no marquee. At the owner's request it has no visible Pause button: hover and keyboard focus stop it, and reduced motion keeps it still, but touch users cannot pause it (WCAG 2.2.2). The passive scroll-velocity tracking, exponential damping, wrapping and skew are preserved in `src/components/ThreeDScrollTrigger.tsx`. CSS replaces the example’s Tailwind helpers. Hover, keyboard focus, explicit pause, reduced motion and offscreen suspension are supported. Clone links remain clickable but are excluded from keyboard and screen-reader navigation. The original static-grid requirement is superseded by this later request.

Motion checks: `PLAYWRIGHT_CHANNEL=chrome node scripts/check-partner-motion.mjs` with the local preview at port 5174.

## Year One picture book

Year One uses the user's supplied `ThreeDImagePageflip` component in `src/lightswind/ThreeDImagePageflip.tsx`. The page-turn implementation is preserved, with optional half-spread rendering and separate alt text added. Photo dimensions determine whether a photo spans two facing pages; photo text overlays are omitted. `YearOnePictureBook` supplies local photos, responsive dimensions and reduced-motion settings. The book starts with an open spread alongside the text and stacks below it on mobile. Previous and Next page buttons make it reachable without the component's window-level arrow keys; it was kept at the owner's request although hultprize.org has no equivalent. The earlier carousel remains available but is no longer used on this page.

## Site motion

Motion matches hultprize.org, which was inspected live before building: no page fade, scroll reveals, count-ups or timeline slide-ins. Buttons scale only the pill behind the label, 1.05 over 150ms `cubic-bezier(.4, 0, .95, 1)`, with no colour change. The header hides on scroll down and returns with a soft shadow on any scroll up, over the same 150ms. The partner strip and the Year One book are the two exceptions, kept at the owner's request.

`src/motion.css` keeps only colour transitions on links, the FAQ and form fields; card lifts and content fades were removed because national has none. On phones Register moves into the menu, as on hultprize.org, so the header lockup stays legible. Reduced-motion preferences switch off the button scale, the header slide, the partner strip, book turns and the team card scale. `scripts/check-site-motion.mjs` verifies all of this and all eight pages at desktop and mobile widths.
