# trywp.now

Try WordPress in your browser: a full-screen, live WordPress site with nothing to sign up for or install.
A proof of concept powered by [WordPress Playground](https://wordpress.github.io/wordpress-playground/),
and a sibling of the (private) wordpress.org download-page redesign demo, where this experience started.

Next.js (App Router), exported as a fully static site.

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
```

## How it's put together

- **The page** (`src/app/page.tsx`) renders `TryWordPress` from `src/components/try/`. It boots
  WordPress Playground via `@wp-playground/client` into a full-screen iframe (`PlaygroundFrame.tsx`),
  shows a loader while it starts, greets the visitor with a welcome modal (`WelcomeModal.tsx`), and
  floats a dock of controls on top (`controls/FloatingDock.tsx`; destinations in `destinations.ts`).
  Styles are in `try.css`.
- **What the visitor lands in** is one of the blueprints in `src/components/try/blueprint.ts`
  (`tryBlueprints`; the first is the default). Each adds its own steps between shared setup and cleanup,
  and serves its theme and demo content from `public/demo/<id>/`, with a `SOURCE` file recording the
  commit they came from. Today there's one: the [Ipsum](https://github.com/WordPress/ipsum) theme and its
  demo content (`public/demo/ipsum/`). Refresh a blueprint's files with
  `scripts/build-demo-content.sh [blueprint] [git-ref]` (defaults: `ipsum`, `trunk`); to add a
  blueprint, add its source to that script and its definition to `tryBlueprints`.
- **New tabs** that WordPress opens (the editor's Preview, "View site") would otherwise land on
  playground.wordpress.net, outside the visitor's site, and 404. A must-use plugin the blueprint installs
  (`src/components/try/preview-tabs.ts`) opens them on trywp.now's `/preview` page instead, which embeds
  the page and so reaches the WordPress still running in the visitor's original tab.
- **Look and feel**: the UI uses wordpress.org's design tokens, block styles (buttons, the `wporg/modal`
  block), fonts (EB Garamond, Inter), and Dashicons. That CSS and the fonts/assets it references are
  vendored into `public/wporg/` and loaded in `src/app/layout.tsx` in the order listed in
  `src/wporg-styles.json`. Refresh them from the live site with `python3 scripts/vendor-wporg.py`.
  Put site-specific CSS in `src/app/globals.css`.

## Deployment

Live at **https://trywp.now**, hosted on [Spacefast](https://spacefast.com) as the public
space `trywp-now` (also reachable at https://trywp-now.view.fast/). The space is linked in
`.spacefast/space.json`. DNS for trywp.now is managed at Porkbun: A records for the apex and
`www` point at Spacefast, and `www` redirects to the apex.

- Manual deploy: `npm run build && sf publish out`
- Pushes to `main` deploy automatically through the Spacefast GitHub App; pull requests and other branches get preview versions.

## License

GPL-2.0-or-later (see `LICENSE`). WordPress, the Ipsum theme, and the vendored wordpress.org CSS are GPL.
