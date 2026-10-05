import type { Blueprint, StepDefinition } from "@wp-playground/client";

/**
 * A site the visitor can land in. Its theme and demo content are served from
 * public/demo/<id>/ — package them with `scripts/build-demo-content.sh <id>`.
 * Our page downloads `url` resources itself, so same-origin files need no CORS setup.
 */
export type TryBlueprint = {
  id: string;
  label: string;
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
 * Policy) and empty the trash, so only the blueprint's own content shows.
 */
const cleanupStep: StepDefinition = {
  step: "runPHP",
  code: `<?php
require '/wordpress/wp-load.php';
foreach ([['hello-world', 'post'], ['sample-page', 'page'], ['privacy-policy', 'page']] as [$slug, $type]) {
  $post = get_page_by_path($slug, OBJECT, $type);
  if ($post) wp_delete_post($post->ID, true);
}
$trashed = get_posts(['post_type' => get_post_types(), 'post_status' => 'trash', 'numberposts' => -1, 'fields' => 'ids']);
foreach ($trashed as $id) wp_delete_post($id, true);`,
};

/**
 * The full Playground blueprint for one of `tryBlueprints`: shared setup, the
 * blueprint's own steps, then cleanup.
 *
 * Reference: https://wordpress.github.io/wordpress-playground/blueprints
 */
export function getTryBlueprint(id: string, origin: string): Blueprint {
  const blueprint = tryBlueprints.find((b) => b.id === id);
  if (!blueprint) throw new Error(`Unknown blueprint "${id}"`);
  return {
    landingPage: "/",
    preferredVersions: { php: "8.3", wp: "latest" },
    features: { networking: true },
    login: true,
    steps: [...blueprint.steps((file) => `${origin}/demo/${blueprint.id}/${file}`), cleanupStep],
  };
}

export const PLAYGROUND_REMOTE_URL = "https://playground.wordpress.net/remote.html";
