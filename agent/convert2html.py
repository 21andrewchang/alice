import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
import html as html_unescape
from typing import Optional
from bs4 import BeautifulSoup


ARXIV_API = "http://export.arxiv.org/api/query"
AR5IV_HTML = "https://ar5iv.org/html/{arxiv_id}"


def _http_get(url: str, timeout: float = 15.0) -> bytes:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def search_arxiv_first_id(query: str) -> Optional[str]:
    """
    Returns the first arXiv ID (e.g., 1706.03762 or 1706.03762v7) for a query,
    or None if nothing found.
    """
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": 1,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    url = f"{ARXIV_API}?{urllib.parse.urlencode(params)}"
    data = _http_get(url)
    root = ET.fromstring(data)

    # Atom namespace handling
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entry = root.find("atom:entry", ns)
    if entry is None:
        return None

    id_tag = entry.find("atom:id", ns)
    if id_tag is None or not id_tag.text:
        return None

    # id looks like: http://arxiv.org/abs/1706.03762v7
    arxiv_url = id_tag.text.strip()
    arxiv_id = arxiv_url.rsplit("/", 1)[-1]
    return arxiv_id


def fetch_ar5iv_html(arxiv_id: str) -> str:
    """
    Fetches the ar5iv HTML for a given arXiv ID and returns it as a UTF-8 string.
    """
    url = AR5IV_HTML.format(arxiv_id=urllib.parse.quote(arxiv_id))
    return _http_get(url).decode("utf-8", errors="replace")


class _TextExtractor(HTMLParser):
    """
    Minimal HTML->text extractor. Keeps block-ish line breaks for readability.
    """
    BLOCK_TAGS = {"p", "div", "section", "article", "br",
                  "hr", "h1", "h2", "h3", "h4", "h5", "h6", "li"}

    def __init__(self):
        super().__init__()
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag in self.BLOCK_TAGS:
            self.out.append("\n")

    def handle_endtag(self, tag):
        if tag in self.BLOCK_TAGS:
            self.out.append("\n")

    def handle_data(self, data):
        if data.strip():
            self.out.append(data)

    def handle_entityref(self, name):
        self.out.append(html_unescape.unescape(f"&{name};"))

    def handle_charref(self, name):
        self.out.append(html_unescape.unescape(f"&#{name};"))

    def get_text(self):
        # collapse excessive whitespace/newlines
        text = "".join(self.out)
        lines = [ln.strip() for ln in text.splitlines()]
        return "\n".join([ln for ln in lines if ln])


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "template"]):
        tag.decompose()          # removes tag + contents
    text = soup.get_text(" ", strip=True)
    return " ".join(text.split())


def fetch_paper_html_or_text(query: str, as_text: bool = True) -> str:
    """
    High-level helper:
    - searches arXiv for `query`
    - fetches ar5iv HTML for the first result
    - returns plain text (default) or raw HTML
    """
    arxiv_id = search_arxiv_first_id(query)
    if not arxiv_id:
        return f"No results for query: {query!r}"

    html_str = fetch_ar5iv_html(arxiv_id)
    if as_text:
        text = html_to_text(html_str)
        # Prepend a header with the paper URL for traceability
        return f"[ar5iv] https://ar5iv.org/html/{arxiv_id}\n\n{text}"
    else:
        return html_str


# ---- Example usage ----
if __name__ == "__main__":
    # 1) Get plain text of the first "transformer attention" paper
    txt = fetch_paper_html_or_text("smolvla", as_text=True)
    print(txt[:10000])  # preview

    # 2) Get raw HTML for "DALL-E" queries
    # html = fetch_paper_html_or_text("DALL-E", as_text=False)
    # print(html[:2000])
