# trywp.now

Try WordPress in your browser: a full-screen, live WordPress site with nothing to sign up for or install.
A proof of concept powered by [WordPress Playground](https://wordpress.github.io/wordpress-playground/),
and a sibling of the (private) wordpress.org download-page redesign demo, where this experience started.

Next.js (App Router), exported as a fully static site.

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
npm run lint
```

## What visitors get

- **A real WordPress site** running in their browser, logged in as "Administrator", with a demo theme
  and content.
- **A welcome dialog** naming the WordPress version they're running, with that release's artwork.
- **A floating control bar**: Get WordPress, Homepage, Dashboard, Edit Site, Reset (which asks first),
  and hide. It can be dragged to any of six spots along the top and bottom edges, and remembers its spot.
  On phones it's a round WordPress button that opens a menu of the same options, and drags the same way.
- **Previews that work**: pages WordPress opens in a new tab, like the editor's Preview, open on
  trywp.now and show the visitor's live site.

## How it's put together

Everything lives in `src/components/try/`; `src/app/page.tsx` renders `TryWordPress`.

| File | What it does |
| --- | --- |
| `TryWordPress.tsx` | The page: boot state, the loader, dialogs, and the controls. |
| `PlaygroundFrame.tsx` | Boots Playground into a full-screen iframe; remounting it boots a fresh site. |
| `blueprint.ts` | The blueprints a visitor can land in (see below). |
| `controls/FloatingDock.tsx` | The control bar and its collapse animation; destinations are in `destinations.ts`. |
| `controls/PhoneDock.tsx` | The phone version of the controls: a button that opens a menu. |
| `controls/useDockPosition.ts` | Dragging the bar between its six spots, and remembering the spot. |
| `TryModal.tsx` | The dialog shell, used by `WelcomeModal.tsx` and `ResetModal.tsx`. |
| `release-art.ts` | Which artwork the welcome shows for each WordPress release (see below). |
| `preview-tabs.ts` | Keeps WordPress's new tabs on trywp.now (see below). |
| `try.css` | All of the above's styles. |

### Blueprints

What the visitor lands in is one of the blueprints in `blueprint.ts` (`tryBlueprints`; the first is the
default). Each adds its own steps between shared setup (removing WordPress's default content, naming the
account) and cleanup (emptying the trash, installing the new-tab plugin). Today there's one: the
[Ipsum](https://github.com/WordPress/ipsum) theme and its demo content.

A blueprint's theme and content are served from `public/demo/<id>/`, with a `SOURCE` file recording the
commit they came from. Refresh them with `scripts/build-demo-content.sh [blueprint] [git-ref]`
(defaults: `ipsum`, `trunk`). To add a blueprint, add its source to that script, run it, and add its
definition to `tryBlueprints`.

### Release artwork

The welcome shows the hero artwork from the running release's page on wordpress.org, read from
`release-art.ts`. Each entry covers a major release and its minor updates (7.1 covers 7.1.x), so a site
on 7.1.2 gets the 7.1 art. Versions without an entry get the welcome without artwork.

To add a release, save its hero image at full size as `public/release-art/<major>.jpg` and add an entry
with its dimensions.

### New tabs and previews

Playground serves the site from `playground.wordpress.net/scope:…/` through a service worker. Browsers
partition service workers by the site embedding them, so a top-level tab on that URL gets a different
service worker that knows nothing about the visitor's site, and 404s. A must-use plugin the blueprint
installs (`preview-tabs.ts`) opens those tabs on trywp.now's `/preview` page instead, which embeds the
URL and so reaches the WordPress still running in the visitor's original tab.

### Look and feel

The UI uses wordpress.org's design tokens, block styles, fonts (EB Garamond, Inter), and Dashicons. That
CSS and the fonts and assets it references are vendored into `public/wporg/` and loaded in
`src/app/layout.tsx` in the order listed in `src/wporg-styles.json`. Refresh them from the live site
with `python3 scripts/vendor-wporg.py`. The dialogs follow the latest release page's typography. Put
site-wide CSS in `src/app/globals.css`.

## Deployment

Live at **https://trywp.now**, hosted on [Spacefast](https://spacefast.com) as the public space
`trywp-now` (also reachable at https://trywp-now.view.fast/). The space is linked in
`.spacefast/space.json`. DNS for trywp.now is managed at Porkbun: A records for the apex and `www` point
at Spacefast, and `www` redirects to the apex.

- Pushes to `main` deploy automatically through the Spacefast GitHub App. Pull requests and other
  branches get preview versions, which are private to the space's members.
- Manual deploy: `npm run build && sf publish out`

## License

GPL-2.0-or-later (see `LICENSE`). WordPress, the Ipsum theme, and the vendored wordpress.org CSS are GPL.
The release artwork in `public/release-art/` comes from wordpress.org's release pages.
