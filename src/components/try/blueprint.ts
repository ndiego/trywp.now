import type { Blueprint } from "@wp-playground/client";

/**
 * What the visitor lands in: the Ipsum theme (https://github.com/WordPress/ipsum)
 * with its demo content. Both are served from public/demo/ — refresh them with
 * `scripts/build-demo-content.sh`. Our page downloads `url` resources itself, so
 * same-origin files need no CORS setup.
 *
 * The demo content's media is hosted on ipsum.mystagingwebsite.com, which WordPress
 * fetches during the import (that host allows cross-origin requests).
 *
 * Reference: https://wordpress.github.io/wordpress-playground/blueprints
 */
export function getTryBlueprint(origin: string): Blueprint {
  return {
    landingPage: "/",
    preferredVersions: { php: "8.3", wp: "latest" },
    features: { networking: true },
    login: true,
    steps: [
      {
        step: "setSiteOptions",
        options: { blogname: "Ipsum", blogdescription: "Until real words arrive" },
      },
      {
        step: "installTheme",
        themeData: { resource: "url", url: `${origin}/demo/ipsum.zip` },
        options: { activate: true },
      },
      {
        step: "importWxr",
        file: { resource: "url", url: `${origin}/demo/ipsum-demo-content.xml` },
      },
      {
        // Remove WordPress's default content so only the Ipsum demo shows.
        step: "runPHP",
        code: `<?php
require '/wordpress/wp-load.php';
foreach ([['hello-world', 'post'], ['sample-page', 'page']] as [$slug, $type]) {
  $post = get_page_by_path($slug, OBJECT, $type);
  if ($post) wp_delete_post($post->ID, true);
}`,
      },
    ],
  };
}

export const PLAYGROUND_REMOTE_URL = "https://playground.wordpress.net/remote.html";
