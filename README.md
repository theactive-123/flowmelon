# FlowMelon — Webflow Development Agency website

Animated marketing site for FlowMelon, built from the designer's Figma file (`New - Flowmelon`). The missing service, blog, case-study, contact and 404 pages were designed to match it.

- **Motion:** GSAP 3.15 (ScrollTrigger, SplitText, Draggable + Inertia, MotionPath) and Lenis 1.3 smooth scroll
- **3D / WebGL:** three.js r186 — a fluted-glass hero shader, a dark nebula with particles, and a morphing glass orb
- **Physics:** Matter.js throwable pills on the About page
- **Responsive:** fluid `rem` scaling (1rem = 16px at 1920px; tuned for 1920 / 1440 / 1366), a tablet layout at ≤991px and a mobile layout at ≤767px
- **Webflow-ready:** Client-First class naming, and every interaction is driven by `data-*` attributes

## Quick start

```bash
npm run dev      # builds to dist/, watches src/ + public/, serves http://localhost:4321
npm run build    # one-off production build into dist/
```

Node 18+ is needed. The site has no runtime npm dependencies: all libraries and fonts are self-hosted in `public/assets/vendor` and `public/assets/fonts`.

To update the libraries, fonts and icons, bump the versions in `package.json`, then run:

```bash
npm install && npm run vendor
```

That copies GSAP, Lenis, Matter.js, the fonts and the icons in from `node_modules`. It also bundles a tree-shaken, minified `three.min.js` with esbuild, because three.js no longer ships a minified build.

`dist/` is plain static HTML, so you can deploy it as-is to Netlify, Vercel, Cloudflare Pages or GitHub Pages. WebGL scenes load as ES modules, so preview through the dev server rather than opening files with `file://`.

## Single-file export (open from disk)

To export every page as one self-contained `.html` file, run:

```bash
npm run export
```

Each file has the HTML, CSS, JS, GSAP, three.js, fonts and images embedded, so it opens with a double-click in Chrome (`file://`), with no server or internet needed.

The output goes to `export/flowmelon-single-pages/` (the files) and `export/flowmelon-single-pages.zip`.

## Pages

| Page | Source | Design reference |
|---|---|---|
| Home | `src/pages/index.html` | Figma: Draft → Home |
| About | `src/pages/about.html` | Figma: Draft → About |
| Services | `src/pages/services.html` | Figma: Draft → Services |
| Work | `src/pages/work.html` | Figma: Draft → Work (dark theme) |
| Webflow Development | `src/pages/services/webflow-development.html` | Draft → Services / Web Development + v3 |
| Figma to Webflow | `src/pages/services/figma-to-webflow.html` | v3 Service Pages |
| Webflow Migration | `src/pages/services/webflow-migration.html` | v3 Service Pages |
| Webflow + Shopify | `src/pages/services/webflow-shopify.html` | v3 Service Pages |
| Webflow Design | `src/pages/services/webflow-design.html` | v2 Pages |
| Case study | `src/pages/work/thermolab.html` | v2 Case Study |
| Blog + 3 articles | `src/pages/blog.html`, `src/pages/blog/*.html` | v2 Blog / Blog Post |
| Contact | `src/pages/contact.html` | v2 Contact |
| 404 | `src/pages/404.html` | v2 404 |

## Structure

```
build.mjs                 tiny static-site builder (partials + page meta → dist/)
src/
  partials/               shared blocks: layout, navbar, menu, footer, FAQ, testimonials, stickers …
  pages/                  one file per page; a comment header sets title / description / css / js
public/assets/
  css/base.css            tokens, type scale, buttons, navbar, menu, cursor, footer, forms
  css/sections.css        reusable sections (stats band, stacking panels, path timeline, bento …)
  css/pages/*.css         page-specific styles
  js/app.js               the interaction engine (all data-attribute driven)
  js/gl.js                three.js scenes (lazy-loaded only where data-gl is used)
  js/pages/*.js           page-only behaviours (calculator, charts, table of contents …)
  vendor/ fonts/ img/
scripts/vendor.mjs        refreshes vendor libraries, fonts and icons from node_modules
```

Each page starts with a comment header:

```html
<!--
title: About FlowMelon — Webflow Designers & Developers
description: …
page: about          ← highlights the current menu item
css: about           ← loads assets/css/pages/about.css
js: about            ← loads assets/js/pages/about.js (optional)
-->
```

## Interaction attributes (`app.js`)

| Attribute | Effect |
|---|---|
| `data-hero-title`, `data-hero-item`, `data-hero-visual` | Intro choreography after the preloader |
| `data-split` | Headline line/word mask reveal on scroll |
| `data-reveal`, `data-reveal-stagger`, `data-pop` | Fade-up, staggered children, elastic pop |
| `data-scrub-text` | Words fill with colour as you scroll |
| `data-count="128" data-suffix="+"` | Number count-up |
| `data-marquee data-speed="40" data-direction="-1"` | Infinite marquee that speeds up with scroll velocity |
| `data-ribbon` | Wavy SVG text ribbon |
| `data-gallery` | Scroll-driven horizontal gallery |
| `data-sticker data-depth="0.6"` | Draggable, throwable glossy sticker with mouse parallax |
| `data-magnetic="0.3"` | Magnetic hover (buttons) |
| `data-cursor="View"` | Custom cursor label |
| `data-tilt="6"`, `.spotlight` | 3D tilt; glow that follows the cursor |
| `data-parallax-img`, `data-clip-reveal`, `data-scale-in` | Image parallax and reveals |
| `data-process` / `data-swing` | Hanging cards that swing with the cursor |
| `data-fan` / `data-fan-card` | Service cards that fan out on scroll |
| `data-testimonials` | Draggable card stack with autoplay |
| `data-faq` | Accordion |
| `data-path` | Winding timeline that draws as you scroll, with an arrow following the path |
| `data-stack-panels` | Sticky stacking panels |
| `data-stepper`, `data-compare`, `data-hscroll` | Sticky stepper, before/after slider, pinned horizontal scroll |
| `data-filter-group="#list"` + `data-filter` / `data-cats` | Animated filtering |
| `data-hover-reveal` + `data-hover-img` | Image that follows the cursor over list rows |
| `data-physics` + `data-pill` | Matter.js throwable pills |
| `data-form`, `data-chip-select` | Form states and chip selectors |
| `data-gl="flutes / nebula / orb"` | three.js scenes |
| `data-clock="America/New_York"` | Live local time |

Accessibility and performance:

- Everything respects `prefers-reduced-motion`.
- The custom cursor and hover effects are disabled on touch devices.
- WebGL pauses when off-screen and falls back to a static image if a shader fails.
- Keep one WebGL scene per page so low-end devices stay smooth.

## Moving it into Webflow

1. **Fonts.** Upload Space Grotesk, DM Sans and Manrope from `public/assets/fonts`, or add them from Google Fonts.
2. **Global styles.** Recreate the variables from `:root` in `base.css` as Webflow Variables, and the type/utility classes (`heading-style-h1`, `padding-global`, `container-large` …) as global classes.
3. **Components.** Turn the navbar, menu, footer, FAQ, testimonials, process cards and stickers into Webflow Components, using the partials in `src/partials` as the reference markup.
4. **Interactions.** Keep the `data-*` attributes on elements (Element settings → Custom attributes).
5. **Scripts.** Add the libraries and `app.js` to Site settings → Custom code → Footer:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/Draggable.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/InertiaPlugin.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/MotionPathPlugin.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/CustomEase.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.min.js"></script>
   <script src="https://YOUR-CDN/app.js" data-root="https://YOUR-CDN/"></script>
   ```
   `data-root` tells `app.js` where to find `gl.js`, `vendor/three.min.js` and `vendor/matter.min.js`. Host them on any CDN, such as jsDelivr from this GitHub repo.
6. **Forms.** Replace the demo submit in `initForms()` with Webflow native forms or your endpoint.
7. **CMS.** Blog posts, case studies and testimonials map directly to CMS Collections; the card partials show the fields.
