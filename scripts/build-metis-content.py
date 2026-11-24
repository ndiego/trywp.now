#!/usr/bin/env python3
"""
Builds public/demo/metis/content.xml, the demo content for the Mētis blueprints.

Mētis doesn't publish its demo content yet, so this reads the public demo site
(https://metisdemo.mystagingwebsite.com/) through the WordPress REST API and writes
a WXR file: its posts, their featured images, categories, tags, author and comments.
Each site's pages and menu are added by its blueprint (src/components/try/blueprint.ts).

The REST API only gives rendered HTML. The demo's posts are paragraphs, headings and
quotes, which convert back to blocks exactly; the script stops if it meets anything
else rather than import a post the editor can't edit. The demo's showcase pages
(Templates, Patterns, Variations, About) are too complex to convert and are left out.

Replace this with the theme's own export once it has one.

Usage: python3 scripts/build-metis-content.py
"""
import html
import json
import os
import re
import sys
import urllib.request
from xml.sax.saxutils import escape

SITE = "https://metisdemo.mystagingwebsite.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "demo", "metis", "content.xml")



def get(path):
    request = urllib.request.Request(f"{SITE}/wp-json/wp/v2/{path}", headers={"User-Agent": "demo-content-builder"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def cdata(text):
    return "<![CDATA[" + (text or "").replace("]]>", "]]]]><![CDATA[>") + "]]>"


def text_of(rendered):
    return html.unescape(re.sub(r"<[^>]+>", "", rendered or "")).strip()


BLOCK = re.compile(
    r"\s*(?:"
    r'<p class="wp-block-paragraph">(?P<p>.*?)</p>'
    r'|<h(?P<level>[2-4]) class="wp-block-heading">(?P<h>.*?)</h(?P=level)>'
    r'|<blockquote class="wp-block-quote[^"]*">(?P<quote>.*?)</blockquote>'
    r")",
    re.S,
)


def to_blocks(rendered, where):
    """Rendered post HTML as block markup. Exits on anything it doesn't know."""
    blocks, position = [], 0
    rendered = rendered.strip()
    while position < len(rendered):
        match = BLOCK.match(rendered, position)
        if not match:
            sys.exit(f"{where}: can't convert to blocks near: {rendered[position:position + 120]!r}")
        position = match.end()
        if match.group("p") is not None:
            blocks.append(f"<!-- wp:paragraph -->\n<p>{match.group('p')}</p>\n<!-- /wp:paragraph -->")
        elif match.group("h") is not None:
            level = match.group("level")
            attrs = "" if level == "2" else f' {{"level":{level}}}'
            blocks.append(
                f'<!-- wp:heading{attrs} -->\n<h{level} class="wp-block-heading">{match.group("h")}</h{level}>\n<!-- /wp:heading -->'
            )
        else:
            inner, cite = match.group("quote").strip(), ""
            cited = re.search(r"<cite>.*?</cite>\s*$", inner, re.S)
            if cited:
                inner, cite = inner[: cited.start()].strip(), cited.group(0).strip()
            blocks.append(
                '<!-- wp:quote -->\n<blockquote class="wp-block-quote">'
                + to_blocks(inner, where)
                + cite
                + "</blockquote>\n<!-- /wp:quote -->"
            )
    return "\n\n".join(blocks)


def item(post_id, post_type, title, slug, date, content="", excerpt="", status="publish", extra="", creator="admin"):
    return f"""
	<item>
		<title>{cdata(title)}</title>
		<dc:creator>{cdata(creator)}</dc:creator>
		<content:encoded>{cdata(content)}</content:encoded>
		<excerpt:encoded>{cdata(excerpt)}</excerpt:encoded>
		<wp:post_id>{post_id}</wp:post_id>
		<wp:post_date>{cdata(date)}</wp:post_date>
		<wp:post_date_gmt>{cdata(date)}</wp:post_date_gmt>
		<wp:comment_status>{cdata("open" if post_type == "post" else "closed")}</wp:comment_status>
		<wp:ping_status>{cdata("closed")}</wp:ping_status>
		<wp:post_name>{cdata(slug)}</wp:post_name>
		<wp:status>{cdata(status)}</wp:status>
		<wp:post_parent>0</wp:post_parent>
		<wp:menu_order>0</wp:menu_order>
		<wp:post_type>{cdata(post_type)}</wp:post_type>
		<wp:is_sticky>0</wp:is_sticky>{extra}
	</item>"""


def meta(key, value):
    return f"""
		<wp:postmeta>
			<wp:meta_key>{cdata(key)}</wp:meta_key>
			<wp:meta_value>{cdata(str(value))}</wp:meta_value>
		</wp:postmeta>"""


def main():
    posts = get("posts?per_page=100")
    media = {m["id"]: m for m in get("media?per_page=100")}
    categories = {c["id"]: c for c in get("categories?per_page=100")}
    tags = {t["id"]: t for t in get("tags?per_page=100")}
    users = {u["id"]: u for u in get("users?per_page=100")}
    comments = get("comments?per_page=100")

    out = [
        f"""<?xml version="1.0" encoding="UTF-8" ?>
<!-- Mētis demo content, built from {SITE} by scripts/build-metis-content.py. -->
<rss version="2.0"
	xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
	<title>Mētis</title>
	<link>{SITE}</link>
	<language>en-US</language>
	<wp:wxr_version>1.2</wp:wxr_version>
	<wp:base_site_url>{SITE}</wp:base_site_url>
	<wp:base_blog_url>{SITE}</wp:base_blog_url>
"""
    ]

    authors = sorted({p["author"] for p in posts})
    for author in authors:
        user = users[author]
        out.append(
            f"""	<wp:author><wp:author_id>{author}</wp:author_id><wp:author_login>{cdata(user["slug"])}</wp:author_login><wp:author_email>{cdata(user["slug"] + "@example.com")}</wp:author_email><wp:author_display_name>{cdata(user["name"])}</wp:author_display_name></wp:author>
"""
        )

    used_categories = sorted({c for p in posts for c in p["categories"]})
    used_tags = sorted({t for p in posts for t in p["tags"]})
    for term_id in used_categories:
        term = categories[term_id]
        out.append(
            f"""	<wp:category><wp:term_id>{term_id}</wp:term_id><wp:category_nicename>{cdata(term["slug"])}</wp:category_nicename><wp:category_parent></wp:category_parent><wp:cat_name>{cdata(html.unescape(term["name"]))}</wp:cat_name></wp:category>
"""
        )
    for term_id in used_tags:
        term = tags[term_id]
        out.append(
            f"""	<wp:tag><wp:term_id>{term_id}</wp:term_id><wp:tag_slug>{cdata(term["slug"])}</wp:tag_slug><wp:tag_name>{cdata(html.unescape(term["name"]))}</wp:tag_name></wp:tag>
"""
        )

    # Featured images. WordPress downloads them from the demo site during the import.
    for media_id in sorted({p["featured_media"] for p in posts if p["featured_media"]}):
        image = media[media_id]
        extra = f"\n\t\t<wp:attachment_url>{cdata(image['source_url'])}</wp:attachment_url>"
        if image["alt_text"]:
            extra += meta("_wp_attachment_image_alt", image["alt_text"])
        out.append(
            item(media_id, "attachment", html.unescape(image["title"]["rendered"]), image["slug"], image["date"].replace("T", " "), status="inherit", extra=extra)
        )

    for post in posts:
        extra = ""
        for term_id in post["categories"]:
            term = categories[term_id]
            extra += f'\n\t\t<category domain="category" nicename="{escape(term["slug"])}">{cdata(html.unescape(term["name"]))}</category>'
        for term_id in post["tags"]:
            term = tags[term_id]
            extra += f'\n\t\t<category domain="post_tag" nicename="{escape(term["slug"])}">{cdata(html.unescape(term["name"]))}</category>'
        if post["featured_media"]:
            extra += meta("_thumbnail_id", post["featured_media"])
        for comment in sorted((c for c in comments if c["post"] == post["id"]), key=lambda c: c["id"]):
            date = comment["date"].replace("T", " ")
            extra += f"""
		<wp:comment>
			<wp:comment_id>{comment["id"]}</wp:comment_id>
			<wp:comment_author>{cdata(comment["author_name"])}</wp:comment_author>
			<wp:comment_author_email>{cdata("")}</wp:comment_author_email>
			<wp:comment_date>{cdata(date)}</wp:comment_date>
			<wp:comment_date_gmt>{cdata(date)}</wp:comment_date_gmt>
			<wp:comment_content>{cdata(text_of(comment["content"]["rendered"]))}</wp:comment_content>
			<wp:comment_approved>{cdata("1")}</wp:comment_approved>
			<wp:comment_type>{cdata("comment")}</wp:comment_type>
			<wp:comment_parent>{comment["parent"]}</wp:comment_parent>
			<wp:comment_user_id>0</wp:comment_user_id>
		</wp:comment>"""
        out.append(
            item(
                post["id"],
                "post",
                html.unescape(post["title"]["rendered"]),
                post["slug"],
                post["date"].replace("T", " "),
                content=to_blocks(post["content"]["rendered"], post["slug"]),
                excerpt=text_of(post["excerpt"]["rendered"]),
                extra=extra,
                creator=users[post["author"]]["slug"],
            )
        )

    out.append("\n</channel>\n</rss>\n")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as file:
        file.write("".join(out))
    print(f"Wrote {len(posts)} posts to {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
