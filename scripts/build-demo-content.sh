#!/usr/bin/env bash
#
# Packages a blueprint's theme and demo content into public/demo/<blueprint>/,
# where its Try WordPress blueprint (src/components/try/blueprint.ts) loads them from.
# Serving them from our own origin keeps boot fast and avoids third-party proxies.
#
# Usage: scripts/build-demo-content.sh [blueprint] [git-ref]   (defaults: ipsum, trunk)
#
# To add a blueprint, give it a case below: the theme's git repo, its slug (the
# theme's folder name), and the path of its WXR demo content inside the repo, or the
# script that builds the content when the repo has none.
#
# Also saves preview.jpg, the picture the theme switcher shows: the theme's screenshot
# by default, or PREVIEWS, a list of "name=url" pictures saved as preview-<name>.jpg.

set -euo pipefail

BLUEPRINT="${1:-ipsum}"
REF="${2:-trunk}"

case "$BLUEPRINT" in
	ipsum)
		REPO="https://github.com/WordPress/ipsum.git"
		SLUG="ipsum"
		CONTENT=".github/ipsum-demo-content.xml"
		;;
	metis)
		REPO="https://github.com/WordPress/metis.git"
		SLUG="metis"
		# Mētis has no demo content file yet, so it's rebuilt from the public demo site.
		CONTENT_SCRIPT="build-metis-content.py"
		# A picture of each starter site, from the demo site's media library.
		UPLOADS="https://metisdemo.mystagingwebsite.com/wp-content/uploads/2026/11"
		PREVIEWS="business=$UPLOADS/metis-artifact%E2%80%94template-business.jpg
news=$UPLOADS/metis-artifact-template-news.jpg
magazine=$UPLOADS/metis-artifact-template-magazine.jpg
portfolio=$UPLOADS/metis-artifact-template-portfolio.jpg
writer=$UPLOADS/metis-artifact-template-writer.jpg
personal=$UPLOADS/metis-artifact-template-personal.jpg"
		;;
	*)
		echo "Unknown blueprint: $BLUEPRINT" >&2
		exit 1
		;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/demo/$BLUEPRINT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --quiet --depth 1 --branch "$REF" "$REPO" "$TMP/$SLUG"
SHA="$(git -C "$TMP/$SLUG" rev-parse --short HEAD)"
SOURCE="${REPO#https://github.com/}"
SOURCE="${SOURCE%.git}"

mkdir -p "$OUT"
if [ -n "${CONTENT_SCRIPT:-}" ]; then
	python3 "$ROOT/scripts/$CONTENT_SCRIPT"
else
	cp "$TMP/$SLUG/$CONTENT" "$OUT/content.xml"
fi

# Switcher pictures, 800px wide.
rm -f "$OUT"/preview*.jpg
if [ -n "${PREVIEWS:-}" ]; then
	while IFS='=' read -r name url; do
		curl -fsSL "$url" -o "$OUT/preview-$name.jpg"
	done <<< "$PREVIEWS"
else
	cp "$TMP/$SLUG/screenshot.jpg" "$OUT/preview.jpg"
fi
for preview in "$OUT"/preview*.jpg; do
	sips --resampleWidth 800 -s formatOptions 80 "$preview" > /dev/null
done

# Theme files only: drop repo tooling, docs, and dev config.
(
	cd "$TMP"
	rm -f "$OUT/$SLUG.zip"
	zip -qr "$OUT/$SLUG.zip" "$SLUG" \
		-x "$SLUG/.*" "$SLUG/.*/*" "$SLUG/bin/*" "$SLUG/tools/*" "$SLUG/node_modules/*" "$SLUG/vendor/*" \
		"$SLUG/composer.*" "$SLUG/package*.json" "$SLUG/lint-staged.config.mjs" "$SLUG/phpcs.xml.dist" \
		"$SLUG/AGENTS.md" "$SLUG/CONTRIBUTING.md" "$SLUG/README.md"
)

echo "$SOURCE@$SHA" > "$OUT/SOURCE"
echo "Packaged $SOURCE@$SHA ($(du -h "$OUT/$SLUG.zip" | cut -f1)) into public/demo/$BLUEPRINT/"
