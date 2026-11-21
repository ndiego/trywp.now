import type { Blueprint, StepDefinition, SupportedPHPVersion } from "@wp-playground/client";
import { previewTabsStep } from "./preview-tabs";

/**
 * A site the visitor can land in. Its theme and demo content are served from
 * public/demo/<theme>/ — package them with `scripts/build-demo-content.sh <theme>`.
 * Our page downloads `url` resources itself, so same-origin files need no CORS setup.
 */
export type TryBlueprint = {
  /** Names the site in `?site=`. */
  id: string;
  /** The theme's name, and what kind of site this is: the theme's purpose, or one of its designs. */
  theme: string;
  design: string;
  /** One line for the site switcher. */
  description: string;
  /** The switcher's picture of the site, a path in public/. */
  preview: string;
  /**
   * The oldest WordPress release its theme supports ("7.1"). Visitors asking for an
   * older version (`?wp=`) get plain WordPress instead: its default theme and content.
   */
  requiresWp: string;
  /** Steps that build this site, run between the shared setup and cleanup. `origin` is ours, for files in public/. */
  steps: (origin: string) => StepDefinition[];
};

/**
 * The Ipsum theme (https://github.com/WordPress/ipsum) with its demo content.
 * The content's media is hosted on ipsum.mystagingwebsite.com, which WordPress
 * fetches during the import (that host allows cross-origin requests).
 */
const ipsum: TryBlueprint = {
  id: "ipsum",
  theme: "Ipsum",
  design: "Blog",
  description: "The new default theme: a blank canvas for a blog.",
  preview: "/demo/ipsum/preview.jpg",
  // Ipsum's "Requires at least".
  requiresWp: "7.2",
  steps: (origin) => [
    {
      step: "setSiteOptions",
      // The logo is an image in the demo content, set by its ID there, as in Ipsum's own blueprint.
      options: { blogname: "Ipsum", blogdescription: "Until real words arrive", site_logo: 78 },
    },
    {
      step: "installTheme",
      themeData: { resource: "url", url: `${origin}/demo/ipsum/ipsum.zip` },
      options: { activate: true },
    },
    { step: "importWxr", file: { resource: "url", url: `${origin}/demo/ipsum/content.xml` } },
  ],
};

/**
 * One of the starter sites of the Mētis theme (https://github.com/WordPress/metis):
 * page templates that each design a whole site. All of them share the theme and its
 * demo posts, whose images WordPress fetches from metisdemo.mystagingwebsite.com
 * during the import; `starter` names the template that becomes the front page.
 */
function metis(starter: string, site: { name: string; tagline: string; description: string }): TryBlueprint {
  return {
    id: `metis-${starter}`,
    theme: "Mētis",
    design: starter[0].toUpperCase() + starter.slice(1),
    description: site.description,
    preview: `/demo/metis/preview-${starter}.jpg`,
    // Mētis's "Requires at least".
    requiresWp: "7.1",
    steps: (origin) => [
      { step: "setSiteOptions", options: { blogname: site.name, blogdescription: site.tagline } },
      {
        step: "installTheme",
        themeData: { resource: "url", url: `${origin}/demo/metis/metis.zip` },
        options: { activate: true },
      },
      { step: "importWxr", file: { resource: "url", url: `${origin}/demo/metis/content.xml` } },
      {
        // The theme's own front page introduces Mētis itself. Replace it with the starter
        // site, the way a visitor would in the Site Editor: as a customized Front Page template.
        step: "runPHP",
        code: `<?php
require '/wordpress/wp-load.php';
$template = wp_insert_post([
  'post_type' => 'wp_template',
  'post_status' => 'publish',
  'post_name' => 'front-page',
  'post_title' => 'Front Page',
  'post_content' => '<!-- wp:pattern {"slug":"metis/${starter}"} /-->',
]);
wp_set_object_terms($template, 'metis', 'wp_theme');`,
      },
    ],
  };
}

/** Every site the visitor can land in. The first is the default. */
export const tryBlueprints: TryBlueprint[] = [
  ipsum,
  metis("business", {
    name: "Landmark",
    tagline: "A studio for brands in motion",
    description: "A studio's site: services, clients, team and pricing.",
  }),
  metis("news", {
    name: "Parallel",
    tagline: "The news, side by side",
    description: "A newspaper's front page, led by a featured story.",
  }),
  metis("magazine", {
    name: "Almanac",
    tagline: "A magazine of slow attention",
    description: "A magazine: the current issue, its makers and the archive.",
  }),
  metis("portfolio", {
    name: "Cora Vale",
    tagline: "Selected work",
    description: "A designer's portfolio, with awards and a playlist.",
  }),
  metis("writer", {
    name: "Iris Calder",
    tagline: "Books, writings and talks",
    description: "An author's home: a new book, its reviews and writings.",
  }),
  metis("personal", {
    name: "Ada Fenn",
    tagline: "Builds and notes",
    description: "A personal site with selected builds and the latest posts.",
  }),
];

export const DEFAULT_BLUEPRINT_ID = tryBlueprints[0].id;

/** The site asked for with `?site=` ("metis-news"), or the default. */
export function getRequestedBlueprintId(search: string): string {
  const id = new URLSearchParams(search).get("site")?.trim().toLowerCase();
  return tryBlueprints.find((b) => b.id === id)?.id ?? DEFAULT_BLUEPRINT_ID;
}

/**
 * Remove WordPress's default content (Hello world, Sample Page, the draft Privacy
 * Policy). Runs before the blueprint's steps, so content they import under the same
 * slugs is kept.
 */
const removeDefaultContentStep: StepDefinition = {
  step: "runPHP",
  code: `<?php
require '/wordpress/wp-load.php';
foreach ([['hello-world', 'post'], ['sample-page', 'page'], ['privacy-policy', 'page']] as [$slug, $type]) {
  $post = get_page_by_path($slug, OBJECT, $type);
  if ($post) wp_delete_post($post->ID, true);
}
update_option('wp_page_for_privacy_policy', 0);`,
};

/**
 * Show the visitor's account as "Administrator" ("Howdy, Administrator", post bylines).
 * Its login stays `admin`, which Playground's auto-login signs in with.
 */
const nameAccountStep: StepDefinition = {
  step: "runPHP",
  code: `<?php
require '/wordpress/wp-load.php';
$user = get_user_by('login', 'admin');
if ($user) wp_update_user(['ID' => $user->ID, 'display_name' => 'Administrator', 'nickname' => 'Administrator']);`,
};

/**
 * Gives that account a Wapuu, WordPress's mascot, as its picture: in the admin bar, on
 * its profile, and beside its posts and comments. WordPress would otherwise ask Gravatar,
 * which has nothing for Playground's made-up address. The picture is public/avatar/wapuu.png,
 * the original Wapuu by Kazuko Kaneuchi (GPL-2.0-or-later, github.com/jawordpressorg/wapuu).
 */
function wapuuAvatarStep(origin: string): StepDefinition {
  return {
    step: "writeFile",
    path: "/wordpress/wp-content/mu-plugins/trywp-wapuu-avatar.php",
    data: `<?php
// Added by trywp.now: a Wapuu as the Administrator account's picture.
add_filter('pre_get_avatar_data', function ($args, $id_or_email) {
  $user = false;
  if (is_numeric($id_or_email)) $user = get_user_by('id', (int) $id_or_email);
  elseif ($id_or_email instanceof WP_User) $user = $id_or_email;
  elseif ($id_or_email instanceof WP_Post) $user = get_user_by('id', (int) $id_or_email->post_author);
  elseif ($id_or_email instanceof WP_Comment) $user = $id_or_email->user_id ? get_user_by('id', (int) $id_or_email->user_id) : get_user_by('email', $id_or_email->comment_author_email);
  elseif (is_string($id_or_email)) $user = get_user_by('email', $id_or_email);
  if ($user && $user->user_login === 'admin') {
    $args['url'] = '${origin}/avatar/wapuu.png';
    $args['found_avatar'] = true;
  }
  return $args;
}, 10, 2);
`,
  };
}

/** Empty the trash after the blueprint's steps, since demo content can import trashed posts. */
const emptyTrashStep: StepDefinition = {
  step: "runPHP",
  code: `<?php
require '/wordpress/wp-load.php';
$trashed = get_posts(['post_type' => get_post_types(), 'post_status' => 'trash', 'numberposts' => -1, 'fields' => 'ids']);
foreach ($trashed as $id) wp_delete_post($id, true);`,
};

/** The WordPress and PHP versions a site runs. */
export type TryVersions = { wp: string; php: SupportedPHPVersion };

/**
 * WordPress is the 7.2 beta for now, since Ipsum needs 7.2 and won't install on 7.1.
 * Once 7.2 is released, set this back to "latest".
 */
export const DEFAULT_VERSIONS: TryVersions = { wp: "beta", php: "8.3" };

/** Playground's PHP versions (checked against its SupportedPHPVersion type). */
const PHP_VERSIONS: readonly SupportedPHPVersion[] = ["8.5", "8.4", "8.3", "8.2", "8.1", "8.0", "7.4"];

/**
 * The versions to run, from the page's query, as on playground.wordpress.net:
 * `?wp=` takes a release ("6.8"), "beta", or "nightly"; `?php=` a PHP version ("8.2").
 * Anything else falls back to the defaults.
 */
export function getRequestedVersions(search: string): TryVersions {
  const params = new URLSearchParams(search);
  const wp = params.get("wp")?.trim().toLowerCase();
  const php = PHP_VERSIONS.find((v) => v === params.get("php")?.trim());
  return {
    wp: wp && /^(latest|beta|trunk|nightly|\d+\.\d+)$/.test(wp) ? wp : DEFAULT_VERSIONS.wp,
    php: php ?? DEFAULT_VERSIONS.php,
  };
}

/** Whether a requested WordPress version is a release older than `min`; latest, beta, and nightly never are. */
function isOlderThan(wp: string, min: string) {
  if (!/^\d+\.\d+$/.test(wp)) return false;
  const [major, minor] = wp.split(".").map(Number);
  const [minMajor, minMinor] = min.split(".").map(Number);
  return major < minMajor || (major === minMajor && minor < minMinor);
}

/**
 * The full Playground blueprint for one of `tryBlueprints`: shared setup (removing
 * default content, naming the account), the blueprint's own steps, then emptying the
 * trash, giving the account its picture, and installing the plugin that keeps new tabs on
 * trywp.now (see preview-tabs.ts).
 * For a WordPress version older than the blueprint supports, it's plain WordPress with
 * just the account's name and picture and the new-tab plugin.
 *
 * Reference: https://wordpress.github.io/wordpress-playground/blueprints
 */
export function getTryBlueprint(id: string, origin: string, versions = DEFAULT_VERSIONS): Blueprint {
  const blueprint = tryBlueprints.find((b) => b.id === id);
  if (!blueprint) throw new Error(`Unknown blueprint "${id}"`);
  const plain = isOlderThan(versions.wp, blueprint.requiresWp);
  return {
    landingPage: "/",
    preferredVersions: versions,
    features: { networking: true },
    login: true,
    steps: plain
      ? [nameAccountStep, wapuuAvatarStep(origin), previewTabsStep(origin)]
      : [
          removeDefaultContentStep,
          nameAccountStep,
          ...blueprint.steps(origin),
          emptyTrashStep,
          wapuuAvatarStep(origin),
          previewTabsStep(origin),
        ],
  };
}

export const PLAYGROUND_REMOTE_URL = "https://playground.wordpress.net/remote.html";
