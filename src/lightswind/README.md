# Lightswind carousel components

`carousel.tsx`, `card.tsx`, and `button.tsx` are upstream component source (trailing whitespace normalized) downloaded from the official Lightswind registry:

- https://lightswind.com/r/carousel.json
- https://lightswind.com/r/card.json
- https://lightswind.com/r/button.json

`plugin.cjs` is the upstream Tailwind plugin (trailing whitespace normalized) from the `lightswind@3.2.5` npm package, renamed from `plugin.js` for this ESM project. Lightswind identifies these free components and its package as MIT licensed, by Code with Muhilan.

The application resolves the original `@/components/lib/utils` import using its Vite/TypeScript alias. Tailwind compiles the actual classes and the official plugin supplies the component theme and button styles.

`../components/PhotoCarousel.tsx` uses the user's CarouselDemo structure and classes. Photos replace number placeholders; captions sit outside the demo. A reduced-motion breakpoint uses the original component's options API without altering its normal motion. The outer application wrapper reserves space for arrows on small screens.

`ThreeDImagePageflip.tsx` is the user's supplied picture-book source (September 17, 2026), with its React import adjusted for TypeScript and optional spread-half image rendering and separate alt text added for the requested landscape spreads. Empty metadata overlays are omitted. It is now used by `YearOnePictureBook.tsx` instead of the carousel on Year One.

`CodeHoverCards.tsx` is based on the user-supplied component. Its cursor-relative radial mask, regenerated character field, scale effects and default motion timings are preserved. Team images replace icons; biographies use staggered upward letter reveals, with touch/keyboard activation and reduced-motion support. The unused icon examples were adjusted for installed lucide exports.
