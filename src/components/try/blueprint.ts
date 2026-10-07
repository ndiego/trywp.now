import type { Blueprint, StepDefinition, SupportedPHPVersion } from "@wp-playground/client";
import { previewTabsStep } from "./preview-tabs";

/**
 * A site the visitor can land in. Its theme and demo content are served from
 * public/demo/<id>/ — package them with `scripts/build-demo-content.sh <id>`.
 * Our page downloads `url` resources itself, so same-origin files need no CORS setup.
 */
export type TryBlueprint = {
  id: string;
  label: string;
  /**
   * The oldest WordPress release its theme supports ("7.1"). Visitors asking for an
   * older version (`?wp=`) get plain WordPress instead: its default theme and content.
   */
  requiresWp: string;
  /** Steps that build this site, run between the shared setup and cleanup. `demo` resolves a file in public/demo/<id>/. */
  steps: (demo: (file: string) => string) => StepDefinition[];
};

/**
 * The Ipsum theme (https://github.com/WordPress/ipsum) with its demo content.
 * The content's media is hosted on ipsum.mystagingwebsite.com, which WordPress
 * fetches during the import (that host allows cross-origin requests).
 */
const ipsum: TryBlueprint = {
  id: "ipsum",
  label: "Blog",
  // Ipsum's "Requires at least".
  requiresWp: "7.1",
  steps: (demo) => [
    {
      step: "setSiteOptions",
      options: { blogname: "Ipsum", blogdescription: "Until real words arrive" },
    },
    {
      step: "installTheme",
      themeData: { resource: "url", url: demo("ipsum.zip") },
      options: { activate: true },
    },
    { step: "importWxr", file: { resource: "url", url: demo("content.xml") } },
  ],
};

/** Every site the visitor can land in. The first is the default. */
export const tryBlueprints: TryBlueprint[] = [ipsum];

export const DEFAULT_BLUEPRINT_ID = tryBlueprints[0].id;

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

export const DEFAULT_VERSIONS: TryVersions = { wp: "latest", php: "8.3" };

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
 * trash and installing the plugin that keeps new tabs on trywp.now (see preview-tabs.ts).
 * For a WordPress version older than the blueprint supports, it's plain WordPress with
 * just the account name and the new-tab plugin.
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
      ? [nameAccountStep, previewTabsStep(origin)]
      : [
          removeDefaultContentStep,
          nameAccountStep,
          ...blueprint.steps((file) => `${origin}/demo/${blueprint.id}/${file}`),
          emptyTrashStep,
          previewTabsStep(origin),
        ],
  };
}

export const PLAYGROUND_REMOTE_URL = "https://playground.wordpress.net/remote.html";
