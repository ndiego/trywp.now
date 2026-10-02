#!/usr/bin/env python3
"""
Snapshot the styles and fonts from https://wordpress.org/download/ into this project so the
Try WordPress UI gets wordpress.org's design tokens, block styles, and fonts without depending
on wordpress.org at runtime.

Re-run any time to refresh:  python3 scripts/vendor-wporg.py

Outputs:
  public/wporg/css/*.css          Theme + block stylesheets (urls rewritten to local copies)
  public/wporg/css/inline-NN.css  Inline <style> blocks from <head> (global styles, layout rules)
  public/wporg/assets/...         Fonts and images referenced by the CSS
  src/wporg-styles.json           Load order for the stylesheets above (used by src/app/layout.tsx)
"""
import os
import re
import urllib.parse
import urllib.request

PAGE_URL = "https://wordpress.org/download/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_DIR = os.path.join(ROOT, "public", "wporg", "css")
ASSET_DIR = os.path.join(ROOT, "public", "wporg", "assets")

# Inline style blocks that are tracking/emoji noise.
SKIP_INLINE = {"jetpack-stats-inline-css", "wp-emoji-styles-inline-css"}
# CJK font imports are tens of MB and unused on the English page.
SKIP_IMPORT = re.compile(r"NotoSerif(JP|KR|SC|TC)", re.I)


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 trywp-now"})
    with urllib.request.urlopen(req) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def strip_query(url):
    return url.split("?")[0].split("#")[0]


def local_asset_path(abs_url):
    """Map https://wordpress.org/wp-content/foo.woff2 -> public/wporg/assets/wp-content/foo.woff2"""
    p = urllib.parse.urlparse(strip_query(abs_url))
    return os.path.join(ASSET_DIR, p.netloc.replace(".", "_"), p.path.lstrip("/"))


def download_asset(abs_url):
    dest = local_asset_path(abs_url)
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        try:
            with open(dest, "wb") as f:
                f.write(fetch(strip_query(abs_url), binary=True))
        except Exception as e:  # noqa: BLE001
            print(f"  ! failed {abs_url}: {e}")
            return None
    return "/" + os.path.relpath(dest, os.path.join(ROOT, "public"))


def localize_css(css, base_url):
    """Inline @imports (except CJK) and download every url() asset."""

    def repl_import(m):
        target = m.group(1)
        if SKIP_IMPORT.search(target):
            return ""
        return localize_css(fetch(urllib.parse.urljoin(base_url, target)), urllib.parse.urljoin(base_url, target))

    css = re.sub(r'@import\s+["\']([^"\']+)["\'];', repl_import, css)

    def repl_url(m):
        raw = m.group(1).strip("'\"")
        if raw.startswith("data:") or raw.startswith("#"):
            return m.group(0)
        local = download_asset(urllib.parse.urljoin(base_url, raw))
        return f'url("{local}")' if local else m.group(0)

    return re.sub(r"url\(([^)]+)\)", repl_url, css)


def main():
    os.makedirs(CSS_DIR, exist_ok=True)
    html = fetch(PAGE_URL)
    head = html[: html.index("<body")]

    # 1. Linked stylesheets, in document order.
    order = []
    for m in re.finditer(r"<(link|style)\b([^>]*)>(?:(.*?)</style>)?", head, re.S):
        tag, attrs, body = m.group(1), m.group(2), m.group(3)
        id_match = re.search(r"id=['\"]([^'\"]+)['\"]", attrs)
        el_id = id_match.group(1) if id_match else None
        if tag == "link":
            if "stylesheet" not in attrs or "media='print'" in attrs:
                continue
            href = re.search(r"href=['\"]([^'\"]+)['\"]", attrs).group(1)
            name = f"{el_id}.css"
            print(f"stylesheet {name}")
            css = localize_css(fetch(href), strip_query(href))
            with open(os.path.join(CSS_DIR, name), "w") as f:
                f.write(css)
            order.append(("file", name))
        elif el_id not in SKIP_INLINE:
            order.append(("inline", el_id, body))

    # 2. Concatenate inline styles in order. They must come *after* the linked
    # sheets that precede them, so record a manifest the layout can follow.
    manifest = []
    inline_chunk = []
    for item in order:
        if item[0] == "file":
            if inline_chunk:
                manifest.append(_flush_inline(inline_chunk, len(manifest)))
                inline_chunk = []
            manifest.append(item[1])
        else:
            inline_chunk.append(f"/* {item[1]} */\n{localize_css(item[2], PAGE_URL)}")
    if inline_chunk:
        manifest.append(_flush_inline(inline_chunk, len(manifest)))

    with open(os.path.join(ROOT, "src", "wporg-styles.json"), "w") as f:
        f.write("[\n" + ",\n".join(f'  "/wporg/css/{n}"' for n in manifest) + "\n]\n")


def _flush_inline(chunks, index):
    name = f"inline-{index:02d}.css"
    with open(os.path.join(CSS_DIR, name), "w") as f:
        f.write("\n\n".join(chunks))
    return name


if __name__ == "__main__":
    main()
