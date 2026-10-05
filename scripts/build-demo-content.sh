#!/usr/bin/env bash
#
# Packages a blueprint's theme and demo content into public/demo/<blueprint>/,
# where its Try WordPress blueprint (src/components/try/blueprint.ts) loads them from.
# Serving them from our own origin keeps boot fast and avoids third-party proxies.
#
# Usage: scripts/build-demo-content.sh [blueprint] [git-ref]   (defaults: ipsum, trunk)
#
# To add a blueprint, give it a case below: the theme's git repo, its slug (the
# theme's folder name), and the path of its WXR demo content inside the repo.

set -euo pipefail

BLUEPRINT="${1:-ipsum}"
REF="${2:-trunk}"

case "$BLUEPRINT" in
	ipsum)
		REPO="https://github.com/WordPress/ipsum.git"
		SLUG="ipsum"
		CONTENT=".github/ipsum-demo-content.xml"
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
cp "$TMP/$SLUG/$CONTENT" "$OUT/content.xml"

# Theme files only: drop repo tooling, docs, and dev config.
(
	cd "$TMP"
	rm -f "$OUT/$SLUG.zip"
	zip -qr "$OUT/$SLUG.zip" "$SLUG" \
		-x "$SLUG/.*" "$SLUG/.*/*" "$SLUG/bin/*" "$SLUG/node_modules/*" "$SLUG/vendor/*" \
		"$SLUG/composer.*" "$SLUG/package*.json" "$SLUG/lint-staged.config.mjs" "$SLUG/phpcs.xml.dist" \
		"$SLUG/AGENTS.md" "$SLUG/CONTRIBUTING.md" "$SLUG/README.md"
)

echo "$SOURCE@$SHA" > "$OUT/SOURCE"
echo "Packaged $SOURCE@$SHA ($(du -h "$OUT/$SLUG.zip" | cut -f1)) into public/demo/$BLUEPRINT/"
