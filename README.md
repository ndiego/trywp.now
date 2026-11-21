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

- **A real WordPress site** running in their browser, logged in as "Administrator" (with a Wapuu for a
  profile picture), with a demo theme and content.
- **A welcome dialog** naming the WordPress version they're running, with that release's artwork.
- **A choice of sites**: the Ipsum blog, or one of the six starter sites of the Mētis theme, picked from
  a gallery in the control bar.
- **A floating control bar**: Get WordPress, Homepage, Dashboard, Edit Site, Try another site, Reset
  (which asks first), and hide. It can be dragged to any of six spots along the top and bottom edges, and remembers its spot.
  On phones it's a round WordPress button that opens a menu of the same options, and drags the same way.
- **Previews that work**: pages WordPress opens in a new tab, like the editor's Preview, open on
  trywp.now and show the visitor's live site.

## Choosing versions

Like playground.wordpress.net, the page takes the versions to run from its URL:

- `?wp=` a WordPress release (`6.8`), `latest`, `beta`, or `nightly`. Defaults to the 7.2 beta
  until 7.2 is released, since Ipsum needs it.
- `?php=` a PHP version from 7.4 to 8.5 (`8.2`). Defaults to 8.3.
- `?site=` the site to start in: `ipsum` (the default) or `metis-business`, `metis-news`,
  `metis-magazine`, `metis-portfolio`, `metis-writer`, `metis-personal`. The site switcher sets it too.

For example, https://trywp.now/?wp=7.0&php=8.2. Releases older than the demo theme supports (Ipsum
needs 7.2) get plain WordPress instead: that version's default theme and sample content. Values in
the wrong format fall back to the defaults; a release number Playground can't run (`?wp=9.9`) shows an
error with a button to use the latest version instead. Reset keeps the same versions.

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
| `TryModal.tsx` | The dialog shell, used by `WelcomeModal.tsx`, `ResetModal.tsx` and `SitesModal.tsx`. |
| `release-art.ts` | Which artwork the welcome shows for each WordPress release (see below). |
| `preview-tabs.ts` | Keeps WordPress's new tabs on trywp.now (see below). |
| `try.css` | All of the above's styles. |

### Blueprints

What the visitor lands in is one of the blueprints in `blueprint.ts` (`tryBlueprints`; the first is the
default), and `SitesModal.tsx` is the gallery that switches between them. Each adds its own steps between
shared setup (removing WordPress's default content, naming the account) and cleanup (emptying the trash,
installing the new-tab plugin), and declares the oldest WordPress release it supports (`requiresWp`).
Today there are seven:

- The [Ipsum](https://github.com/WordPress/ipsum) theme and its demo content.
- The six starter sites of the [Mētis](https://github.com/WordPress/metis) theme (Business, News,
  Magazine, Portfolio, Writer, Personal). They share one theme and one set of posts; each sets its
  starter site's design as the Front Page template.

A theme's files are served from `public/demo/<theme>/`: the theme zip, `content.xml`, the pictures the
gallery shows, and a `SOURCE` file recording the commit they came from. Refresh them with
`scripts/build-demo-content.sh [theme] [git-ref]` (defaults: `ipsum`, `trunk`). To add a site, add its
theme to that script, run it, and add its definition to `tryBlueprints`.

Mētis doesn't publish demo content yet, so `scripts/build-metis-content.py` rebuilds it from the
theme's [public demo site](https://metisdemo.mystagingwebsite.com/): its posts (converted back to
blocks), their images, categories, tags and comments. It leaves out that site's showcase pages, which
can't be converted. Swap it for the theme's own export once there is one.

### Release artwork

The welcome shows the hero artwork from the running release's page on wordpress.org, read from
`release-art.ts`. Each entry covers a major release and its minor updates (7.1 covers 7.1.x), so a site
on 7.1.2 gets the 7.1 art. Versions without an entry get the welcome without artwork.

To add a release, save its hero image at full size as `public/release-art/<major>.jpg` and add an entry
with its dimensions.

### New tabs and previews

Playground serves the site from its sandbox origin, `wpsandbox.wordpress.net/scope:…/`, through a
service worker. Browsers partition service workers by the site embedding them, so a top-level tab on
that URL gets a different service worker that knows nothing about the visitor's site, and can't show it.
A must-use plugin the blueprint installs (`preview-tabs.ts`) opens those tabs on trywp.now's `/preview`
page instead, which embeds the URL and so reaches the WordPress still running in the visitor's original
tab. That covers tabs WordPress opens (`window.open()`, links with a `target`) and links the visitor
opens in a new tab with a middle-click or Cmd/Ctrl/Shift-click. The browser's own "Open link in new tab"
menu item can't be rerouted.

`/preview` only embeds URLs on the hosts listed in `PLAYGROUND_SITE_HOSTS`. If Playground changes where
it serves sites from, previews show "This preview isn't available" until the new host is added there.

Without a preview to show, `/preview` sends the visitor to the demo instead (`TryPreview.tsx`): when
someone lands on it directly, when its link isn't to a Playground site, and when WordPress opens the tab
but its preview hasn't arrived after 15 seconds.

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

GPL-2.0-or-later (see `LICENSE`). WordPress, the Ipsum and Mētis themes, and the vendored wordpress.org CSS
are GPL. The Mētis demo posts and pictures come from the theme's public demo site.
The release artwork in `public/release-art/` comes from wordpress.org's release pages. The Administrator's picture,
`public/avatar/wapuu.png`, is the original [Wapuu](https://github.com/jawordpressorg/wapuu) by Kazuko Kaneuchi
(GPL-2.0-or-later), cropped.
