#!/usr/bin/env bash
#
# Packages the Ipsum theme (https://github.com/WordPress/ipsum) and its demo
# content into public/demo/, where the Try WordPress blueprint loads them from.
# Serving them from our own origin keeps boot fast and avoids third-party proxies.
#
# Usage: scripts/build-demo-content.sh [git-ref]   (default: trunk)

set -euo pipefail

REF="${1:-trunk}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/demo"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --quiet --depth 1 --branch "$REF" https://github.com/WordPress/ipsum.git "$TMP/ipsum"
SHA="$(git -C "$TMP/ipsum" rev-parse --short HEAD)"

mkdir -p "$OUT"
cp "$TMP/ipsum/.github/ipsum-demo-content.xml" "$OUT/ipsum-demo-content.xml"

# Theme files only: drop repo tooling, docs, and dev config.
(
	cd "$TMP"
	rm -f "$OUT/ipsum.zip"
	zip -qr "$OUT/ipsum.zip" ipsum \
		-x 'ipsum/.*' 'ipsum/.*/*' 'ipsum/bin/*' 'ipsum/node_modules/*' 'ipsum/vendor/*' \
		'ipsum/composer.*' 'ipsum/package*.json' 'ipsum/lint-staged.config.mjs' 'ipsum/phpcs.xml.dist' \
		'ipsum/AGENTS.md' 'ipsum/CONTRIBUTING.md' 'ipsum/README.md'
)

echo "WordPress/ipsum@$SHA" > "$OUT/SOURCE"
echo "Packaged WordPress/ipsum@$SHA ($(du -h "$OUT/ipsum.zip" | cut -f1)) into public/demo/"
