#!/usr/bin/env python3
import argparse
import ipaddress
import json
import re
import socket
import sys
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

USER_AGENT = "WebactueelDesigncheckerSEO/1.0"


def validate_public_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("A full public http/https URL is required.")
    if parsed.username or parsed.password:
        raise ValueError("Credentials in URLs are not allowed.")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM)}
    if not addresses:
        raise ValueError("Target has no resolvable IP address.")
    for raw in addresses:
        if not ipaddress.ip_address(raw).is_global:
            raise ValueError(f"Non-public target refused: {raw}")
    return url


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.in_h1 = False
        self.in_jsonld = False
        self.title_parts, self.h1_parts, self.h1s = [], [], []
        self.meta, self.links, self.jsonld_raw, self._jsonld_parts = [], [], [], []

    def handle_starttag(self, tag, attrs):
        attrs = {str(k).lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag == "title": self.in_title = True
        elif tag == "h1": self.in_h1, self.h1_parts = True, []
        elif tag == "meta": self.meta.append(attrs)
        elif tag == "link": self.links.append(attrs)
        elif tag == "script" and attrs.get("type", "").lower() == "application/ld+json": self.in_jsonld, self._jsonld_parts = True, []

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title": self.in_title = False
        elif tag == "h1":
            self.in_h1 = False
            text = " ".join("".join(self.h1_parts).split())
            if text: self.h1s.append(text)
        elif tag == "script" and self.in_jsonld:
            self.in_jsonld = False
            raw = "".join(self._jsonld_parts).strip()
            if raw: self.jsonld_raw.append(raw)

    def handle_data(self, data):
        if self.in_title: self.title_parts.append(data)
        if self.in_h1: self.h1_parts.append(data)
        if self.in_jsonld: self._jsonld_parts.append(data)


def fetch(url: str, timeout: int = 20, max_redirects: int = 5):
    opener = build_opener(NoRedirect())
    current = validate_public_url(url)
    chain = []
    for _ in range(max_redirects + 1):
        req = Request(current, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"})
        try:
            response = opener.open(req, timeout=timeout)
            body = response.read(8_000_000)
            charset = response.headers.get_content_charset() or "utf-8"
            return response.status, current, dict(response.headers.items()), body.decode(charset, errors="replace"), chain
        except HTTPError as exc:
            if exc.code in {301, 302, 303, 307, 308} and exc.headers.get("Location"):
                next_url = urljoin(current, exc.headers["Location"])
                validate_public_url(next_url)
                chain.append({"status": exc.code, "from": current, "to": next_url})
                current = next_url
                continue
            return exc.code, current, dict(exc.headers.items()), "", chain
    raise ValueError("Too many redirects.")


def meta_values(parser, key, value):
    return [m.get("content", "").strip() for m in parser.meta if m.get(key, "").lower() == value and m.get("content")]


def jsonld_types(value):
    found = set()
    if isinstance(value, dict):
        t = value.get("@type")
        if isinstance(t, str): found.add(t)
        elif isinstance(t, list): found.update(str(item) for item in t)
        for child in value.values(): found.update(jsonld_types(child))
    elif isinstance(value, list):
        for child in value: found.update(jsonld_types(child))
    return found


def analyze(html: str, base_url: str):
    parser = PageParser(); parser.feed(html)
    title = " ".join("".join(parser.title_parts).split())
    descriptions = meta_values(parser, "name", "description")
    robots = meta_values(parser, "name", "robots")
    googlebot = meta_values(parser, "name", "googlebot")
    canonicals = [urljoin(base_url, x.get("href", "")) for x in parser.links if "canonical" in x.get("rel", "").lower().split() and x.get("href")]
    types, json_errors = set(), []
    for raw in parser.jsonld_raw:
        try: types.update(jsonld_types(json.loads(raw)))
        except json.JSONDecodeError as exc: json_errors.append(f"line {exc.lineno}, column {exc.colno}: {exc.msg}")
    directives = ",".join(robots + googlebot).lower()
    blockers, warnings = [], []
    if re.search(r"(?:^|[,\s])noindex(?:$|[,\s])", directives): blockers.append("meta robots/googlebot contains noindex")
    if not title: warnings.append("title missing")
    if not descriptions: warnings.append("meta description missing")
    if not parser.h1s: warnings.append("H1 missing")
    if not canonicals: warnings.append("canonical missing")
    if json_errors: warnings.append("invalid JSON-LD found")
    return {"title": title, "title_length": len(title), "meta_descriptions": descriptions, "robots": robots, "googlebot": googlebot, "h1": parser.h1s, "canonical": canonicals, "jsonld_blocks": len(parser.jsonld_raw), "jsonld_types": sorted(types), "jsonld_errors": json_errors, "indexability_blockers": blockers, "warnings": warnings}


def probe(url: str, timeout: int = 15):
    try:
        status, final_url, headers, body, redirects = fetch(url, timeout)
        return {"url": url, "status": status, "final_url": final_url, "content_type": headers.get("Content-Type", ""), "redirects": redirects, "body": body}
    except (URLError, TimeoutError, OSError, ValueError, socket.gaierror) as exc:
        return {"url": url, "status": None, "error": str(exc), "body": ""}


def run(url: str):
    validate_public_url(url)
    page = probe(url, 25)
    result = {"schema_version": "webactueel-seo-technical/1.0", "requested_url": url, "http": {k:v for k,v in page.items() if k != "body"}, "source": "Yolol100/Designchecker:scripts/seo-technical.py"}
    if page.get("status") is None or page.get("status", 999) >= 400:
        result.update({"indexability_blockers":[f"page unusable: HTTP {page.get('status') or 'error'}"], "warnings":[]}); return result
    result.update(analyze(page.get("body", ""), page["final_url"]))
    origin = f"{urlparse(page['final_url']).scheme}://{urlparse(page['final_url']).netloc}"
    robots = probe(urljoin(origin + "/", "robots.txt")); robots_body = robots.pop("body", "")
    sitemaps = [line.split(":",1)[1].strip() for line in robots_body.splitlines() if line.lower().startswith("sitemap:") and line.split(":",1)[1].strip()]
    if not sitemaps: sitemaps = [urljoin(origin + "/", "sitemap.xml")]
    sitemap = probe(sitemaps[0]); sitemap.pop("body", None)
    result["robots_txt"], result["sitemap_candidates"], result["sitemap_probe"] = robots, sitemaps, sitemap
    return result


def main():
    p = argparse.ArgumentParser(); p.add_argument("url"); args = p.parse_args()
    try: result, code = run(args.url), 0
    except Exception as exc: result, code = {"schema_version":"webactueel-seo-technical/1.0","requested_url":args.url,"fatal_error":str(exc)}, 2
    print(json.dumps(result, ensure_ascii=False))
    return code

if __name__ == "__main__": sys.exit(main())
