#!/usr/bin/env python3
"""Build index.html from src/template.html and data/species.json.

Run from the repository root:

    python3 build.py

The species dataset is embedded in the page (so it works from a local file as
well as on GitHub Pages) and a crawlable species index is rendered as static
HTML, so search engines see every species name without running JavaScript.
"""
import datetime
import html
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
DATA = json.loads((ROOT / "data" / "species.json").read_text(encoding="utf-8"))
TEMPLATE = (ROOT / "src" / "template.html").read_text(encoding="utf-8")

GROUP_VAR = {
    "Pre-australopith": "var(--c-pre)",
    "Australopithecus": "var(--c-australopithecus)",
    "Paranthropus": "var(--c-paranthropus)",
    "Homo": "var(--c-homo)",
    "Sapiens": "var(--c-sapiens)",
}


def ma(t):
    if t == 0:
        return "now"
    if t >= 1:
        return f"{t:g} Ma"
    return f"{round(t * 1000)} ka"


def num(v, unit=""):
    return "—" if v is None else f"{round(v):,}{unit}"


def species_cards():
    out = []
    for s in DATA["species"]:
        cc, h = s["cranial_cc"], s["height_cm"]
        meta = f"<b>{ma(s['time']['max'])} – {ma(s['time']['min'])}</b> · brain {num(cc['mean'], ' cc')} · height {num(h['mean'], ' cm')}"
        out.append(
            f'    <article class="card sp" id="{s["id"]}" style="--group:{GROUP_VAR[s["group"]]}">\n'
            f'      <h3>{html.escape(s["name"])}</h3>\n'
            f'      <div class="meta">{meta}</div>\n'
            f'      <p>{html.escape(s["fact"])}</p>\n'
            f'      <div class="status">Found {s["found"]}, {html.escape(s["country"])}. {html.escape(s["status"])}</div>\n'
            f'      <div class="row"><button class="btn small" type="button" data-open="{s["id"]}">Open profile</button></div>\n'
            f'    </article>'
        )
    return "\n".join(out)


def sources_list():
    return "\n".join(
        f'    <li id="src-{k}"><a href="{v["url"]}" rel="noopener">{html.escape(v["label"])}</a></li>'
        for k, v in DATA["sources"].items()
    )


def json_ld():
    url = "https://curtishoffmann.com/humanevolution/"
    person = {"@type": "Person", "name": "Curtis Hoffmann", "url": "https://curtishoffmann.com/"}
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": url,
                "url": url,
                "name": "Twenty-Four Cousins · A field guide to the human family",
                "description": "An interactive field guide to 24 hominin species with sourced dates, cranial capacities and traits.",
                "author": person,
                "isPartOf": {"@type": "WebSite", "name": "Curtis Hoffmann", "url": "https://curtishoffmann.com/"},
                "primaryImageOfPage": url + "assets/og-image.png",
                "dateModified": DATA["version"],
                "about": [{"@type": "Thing", "name": s["name"]} for s in DATA["species"]],
            },
            {
                "@type": "Dataset",
                "@id": url + "data/species.json",
                "name": "Twenty-Four Cousins hominin species dataset",
                "description": "Time range, cranial capacity, stature, discovery details and qualitative traits for 24 hominin species, compiled from the Smithsonian Human Origins Program, the Australian Museum and primary literature.",
                "url": url + "#sources",
                "creator": person,
                "license": "https://creativecommons.org/licenses/by/4.0/",
                "dateModified": DATA["version"],
                "keywords": ["human evolution", "hominin", "paleoanthropology", "Homo", "Australopithecus", "Paranthropus", "cranial capacity"],
                "distribution": {"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": url + "data/species.json"},
                "isBasedOn": [v["url"] for v in DATA["sources"].values()],
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Curtis Hoffmann", "item": "https://curtishoffmann.com/"},
                    {"@type": "ListItem", "position": 2, "name": "Twenty-Four Cousins", "item": url},
                ],
            },
        ],
    }
    return json.dumps(graph, indent=1, ensure_ascii=False)


def asset_version():
    """Short hash of the stylesheet and script, so a change to either busts browser caches."""
    import hashlib
    h = hashlib.sha256()
    for f in ("styles.css", "app.js"):
        fp = ROOT / "assets" / f
        if fp.exists():
            h.update(fp.read_bytes())
    return h.hexdigest()[:10]


def main():
    page = (
        TEMPLATE.replace("{{SPECIES_INDEX}}", species_cards())
        .replace("{{SOURCES_LIST}}", sources_list())
        .replace("{{JSON_LD}}", json_ld())
        .replace("{{N_SOURCES}}", str(len(DATA["sources"])))
        .replace("{{ASSET_VERSION}}", asset_version())
        .replace("{{BUILD_DATE}}", datetime.date.fromisoformat(DATA["version"]).strftime("%-d %B %Y"))
        .replace("{{SPECIES_JSON}}", json.dumps(DATA, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/"))
    )
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    print(f"wrote index.html ({len(page):,} bytes, {len(DATA['species'])} species)")


if __name__ == "__main__":
    main()
