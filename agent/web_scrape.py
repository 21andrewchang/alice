from openai import OpenAI
from urllib.parse import urlencode, quote_plus
import re
import json
import os
import pathlib
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Optional, Tuple, Any, List, Dict
from bs4 import BeautifulSoup
from dotenv import load_dotenv

PAPERS_DIR = pathlib.Path("papers")
TOPICS_DIR = pathlib.Path("topics")
ARXIV_API = "http://export.arxiv.org/api/query"
AR5IV_HTML = "https://ar5iv.org/html/{arxiv_id}"

# ------------ HTTP helper ------------


def _http_get(url: str, timeout: float = 15.0) -> bytes:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


# ------------ OpenAI client ------------
_ = load_dotenv()
client = OpenAI()

# ------------ Minimal agent shell ------------


class Agent:
    def __init__(self, system=""):
        self.system = system
        self.messages = []
        if self.system:
            self.messages.append({"role": "system", "content": system})

    def __call__(self, message):
        self.messages.append({"role": "user", "content": message})
        result = self.execute()
        self.messages.append({"role": "assistant", "content": result})
        return result

    def execute(self):
        completion = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.1,
            messages=self.messages
        )
        return completion.choices[0].message.content


# ------------ System prompt (STRONGLY forbids markdown fences) ------------
prompt = """
You run in a loop of Thought, Action, PAUSE, Observation.

At the end, OUTPUT ONLY a RAW JSON ARRAY of topic objects (no prose, no fences). If you cannot comply, output [].

Use Thought to reason briefly.
Use Action to run one of the actions available to you, then return PAUSE.
Observation will be the result of running those actions.

MUST-DO TOOL USE
- You MUST call `find_paper_id` (if given a query) and then `return_core_text` for that id.
- Do NOT answer until you have an Observation that contains [ABSTRACT] or [INTRODUCTION] from `return_core_text`.
- If core text is unavailable, output [].

GOAL
Given the core text (Abstract + Introduction + optional Methods + Conclusion), produce 6–15 textbook-grade technical topics that would each merit a focused lecture or textbook section. Topics should be either (a) central technical ideas explicitly mentioned in the paper, or (b) clear prerequisites needed to understand those ideas.

STRICT ACCEPTANCE GATE (drop a candidate if ANY fails)
1) Teachable & canonical: a standard ML/CS/math/robotics concept, model, algorithm, objective, architecture, dataset, benchmark, or task.
2) Lecture-worthy: something you could teach for 30–90 minutes (e.g., “Flow Matching”, “Cross-Attention”, “Reinforcement Learning”, “Transformer”, “Vision-Language-Action models”, “Large Language Models”, “Meta-World benchmark”).
3) Central or prerequisite: directly tied to the paper’s claims or necessary background.
4) Specific & definable: not vague meta-terms.
5) Canonical naming: ≤ 6 words, normalized to standard textbook form (prefer exact names found in the text).

HARD REJECTIONS (never include)
- Buzzwords/meta/logistics: “consumer-grade hardware”, “open-source initiative”, “responsiveness/efficiency” (alone), “community-driven datasets” (alone), “training costs”, “deployability”, “latency” (alone), “generalization” (alone).
- Project names with no broader concept unless they are well-known baselines/datasets/benchmarks/models (e.g., keep “Meta-World”, “LIBERO”, “OpenVLA” where appropriate).

SELECTION PRIORITIES
- Prefer explicit phrases in the core text (models, methods, losses, datasets, benchmarks, tasks, math).
- Prefer foundational prerequisites when explicitly referenced (e.g., “Transformer”, “Cross-Attention”, “Imitation Learning”, “Reinforcement Learning”, “Large Language Models”, “Vision-Language Models”, “Flow Matching”, “Action Chunking”).
- Include datasets/benchmarks only by their canonical names (e.g., “Meta-World”, “LIBERO”).
- Include objectives/losses/math if named (e.g., “Flow Matching”, “Contrastive Learning” only if explicitly present).

OUTPUT FORMAT (RAW JSON ARRAY ONLY)
Each topic object:
{
  "label": "<=6 words, canonical>",
  "category": one of ["model","method","architecture","dataset","benchmark","task","objective","metric","math","concept"],
  "type": "mentioned" | "prerequisite",
  "confidence": float in [0,1],
  "rationale": "6–12 words; quote or paraphrase an exact phrase from the text"
}

QUANTITY & ORDERING
- Return 6 HIGH QUALITY TEXTBOOK-GRADE topics. Do NOT pad with weak items; fewer is fine.
- Sort by confidence descending.

QUALITY GUARD
- If fewer than 6 candidates pass, return only those that pass (possibly <6). Never include banned/buzzy items.
- If you have not seen core text, output [].

EXAMPLE

Question: Extract topics for SmolVLA.
Thought: I need the arXiv id and the core sections first.
Action: find_paper_id: SmolVLA
PAUSE
Observation: 2506.01844v1
Thought: Fetch abstract/introduction/conclusion to ground topic selection.
Action: return_core_text: 2506.01844v1
PAUSE
Observation: [ABSTRACT] … “a small, efficient vision-language-action model … interleaving cross- and self-attention … trained with flow matching … predicts action chunks … evaluated on LIBERO and Meta-World … pretrained vision-language model backbone … imitation learning … Transformer-based …”
Thought: Apply acceptance gate; drop buzzwords (e.g., consumer-grade hardware). Keep canonical, lecture-worthy concepts and benchmarks explicitly mentioned or required.

Answer:
[
  {
    "label": "Vision-Language-Action Models",
    "category": "concept",
    "type": "mentioned",
    "confidence": 0.96,
    "rationale": "Paper introduces a compact vision–language–action model."
  },
  {
    "label": "Vision-Language Models",
    "category": "model",
    "type": "prerequisite",
    "confidence": 0.93,
    "rationale": "Backbone uses a pretrained vision–language model."
  },
  {
    "label": "Transformer",
    "category": "architecture",
    "type": "prerequisite",
    "confidence": 0.92,
    "rationale": "Model described as transformer-based throughout the paper."
  },
  {
    "label": "Cross-Attention",
    "category": "architecture",
    "type": "mentioned",
    "confidence": 0.91,
    "rationale": "Interleaving cross- and self-attention blocks described."
  },
  {
    "label": "Self-Attention",
    "category": "architecture",
    "type": "mentioned",
    "confidence": 0.9,
    "rationale": "Self-attention layers paired with cross-attention blocks."
  },
  {
    "label": "Flow Matching",
    "category": "objective",
    "type": "mentioned",
    "confidence": 0.9,
    "rationale": "Action expert trained with flow matching objective."
  },
  {
    "label": "Action Chunking",
    "category": "method",
    "type": "mentioned",
    "confidence": 0.88,
    "rationale": "Predicts chunks of low-level actions for control."
  },
  {
    "label": "Imitation Learning",
    "category": "method",
    "type": "mentioned",
    "confidence": 0.86,
    "rationale": "Pretraining described as imitation learning on datasets."
  },
  {
    "label": "Large Language Models",
    "category": "model",
    "type": "prerequisite",
    "confidence": 0.82,
    "rationale": "Context references foundation and large language models."
  }]
""".strip()

# ------------ Actions ------------


def return_text(arxiv_id: str, timeout: float = 15.0) -> str:
    """Save FULL plaintext of paper to papers/<id>.txt; return that path."""
    url = f"https://ar5iv.org/html/{urllib.parse.quote(arxiv_id.strip())}"
    with urllib.request.urlopen(url, timeout=timeout) as r:
        html = r.read().decode("utf-8", errors="replace")

    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "noscript", "template"]):
        t.decompose()
    text = " ".join(soup.get_text(" ", strip=True).split())

    PAPERS_DIR.mkdir(parents=True, exist_ok=True)
    safe_id = re.sub(r"[^\w\-\.]+", "_", arxiv_id.strip())
    out_path = PAPERS_DIR / f"{safe_id}.txt"
    out_path.write_text(text, encoding="utf-8")
    return str(out_path)


def _extract_core_from_html(html: str) -> str:
    """Extract abstract + intro (+methods optional) + conclusion/discussion; return trimmed text."""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "noscript", "template"]):
        t.decompose()

    def _text(node):
        return " ".join(node.get_text(" ", strip=True).split())

    # Title
    title = ""
    for sel in ["h1.ltx_title.ltx_title_document", "h1.ltx_title", "header h1", "h1.title", "title"]:
        n = soup.select_one(sel)
        if n:
            title = _text(n)
            break

    # Abstract
    abstract = ""
    for sel in ["div.ltx_abstract", "section#abstract"]:
        n = soup.select_one(sel)
        if n:
            abstract = _text(n)
            break

    def _grab_section(keywords):
        heads = soup.find_all(re.compile(r"^h[1-6]$"))
        for h in heads:
            htxt = _text(h).lower()
            if any(k in htxt for k in keywords):
                chunks = []
                for sib in h.next_siblings:
                    if getattr(sib, "name", None) and re.match(r"^h[1-6]$", sib.name):
                        break
                    if getattr(sib, "get_text", None):
                        chunks.append(_text(sib))
                    elif isinstance(sib, str) and sib.strip():
                        chunks.append(sib.strip())
                return " ".join(c for c in chunks if c)
        return ""

    if not abstract:
        abstract = _grab_section(["abstract"])
    introduction = _grab_section(["introduction", "background", "overview"])
    methods = _grab_section(["method", "approach"])
    conclusion = _grab_section(
        ["conclusion", "conclusions", "discussion", "summary", "limitations", "future work"])

    parts = []
    if title:
        parts.append(f"[TITLE] {title}")
    if abstract:
        parts.append("[ABSTRACT]\n" + abstract)
    if introduction:
        parts.append("[INTRODUCTION]\n" + introduction)
    if methods:
        parts.append("[METHODS]\n" + methods)
    if conclusion:
        parts.append("[CONCLUSION]\n" + conclusion)

    core = "\n\n".join(parts).strip()
    core = re.split(r"\breferences\b|\backnowledg(e)?ments\b",
                    core, flags=re.I)[0]
    return core[:12000]  # cap length


def return_core_text(id_or_path: str, timeout: float = 15.0) -> str:
    """
    Save Abstract+Introduction+optional Methods+Conclusion to papers/<id>.core.txt and
    RETURN the core text itself (trimmed), so the agent can extract topics without another tool.
    Accepts arXiv ID or a path to papers/<id>.txt.
    """
    core_text = ""
    arxiv_id = None

    p = pathlib.Path(id_or_path)
    if p.exists():
        arxiv_id = p.stem.replace(".core", "")
        text = p.read_text(encoding="utf-8", errors="ignore")
        # Try reconstruct via ar5iv headings if we can guess id; else fallback
        try:
            m = re.search(r"(\d{4}\.\d{4,5}(v\d+)?)", p.name)
            guessed = m.group(1) if m else arxiv_id
            if guessed:
                url = AR5IV_HTML.format(
                    arxiv_id=urllib.parse.quote(guessed.strip()))
                with urllib.request.urlopen(url, timeout=timeout) as r:
                    html = r.read().decode("utf-8", errors="replace")
                core_text = _extract_core_from_html(html)
                arxiv_id = guessed
            else:
                core_text = text[:12000]
        except Exception:
            core_text = text[:12000]
    else:
        arxiv_id = id_or_path.strip()
        url = AR5IV_HTML.format(arxiv_id=urllib.parse.quote(arxiv_id))
        with urllib.request.urlopen(url, timeout=timeout) as r:
            html = r.read().decode("utf-8", errors="replace")
        core_text = _extract_core_from_html(html)

    PAPERS_DIR.mkdir(parents=True, exist_ok=True)
    safe_id = re.sub(r"[^\w\-\.]+", "_", (arxiv_id or "paper").strip())
    out_path = PAPERS_DIR / f"{safe_id}.core.txt"
    out_path.write_text(core_text, encoding="utf-8")

    return core_text


def find_paper_id(query: str) -> Optional[str]:
    """Return first arXiv ID for a query, or None."""
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
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entry = root.find("atom:entry", ns)
    if entry is None:
        return None
    id_tag = entry.find("atom:id", ns)
    if id_tag is None or not id_tag.text:
        return None
    arxiv_url = id_tag.text.strip()  # http://arxiv.org/abs/1706.03762v7
    arxiv_id = arxiv_url.rsplit("/", 1)[-1]
    return arxiv_id

# ------------ Post-processing helpers ------------


_ALLOWED = {"model", "method", "architecture", "dataset",
            "benchmark", "task", "objective", "metric", "math", "concept"}
_CAT_MAP = {
    "learning paradigm": "concept",
    "algorithm": "method",
    "loss": "objective",
    "theory": "math",
}


def _extract_json_array(raw: str) -> List[Dict[str, Any]]:
    """Extract a JSON array from model text (strip backticks, tags, etc.)."""
    s = raw.strip()

    # Strip ```json ... ``` or ``` ... ```
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", s, flags=re.S | re.I)
    if fence:
        s = fence.group(1).strip()

    # If still not an array, grab between first '[' and last ']'
    if not s.lstrip().startswith("["):
        i, j = s.find("["), s.rfind("]")
        if i != -1 and j != -1 and j > i:
            s = s[i:j+1].strip()

    try:
        parsed = json.loads(s)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and "topics" in parsed and isinstance(parsed["topics"], list):
            return parsed["topics"]
    except Exception:
        pass
    return []


def _normalize_topics(topics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    norm: List[Dict[str, Any]] = []
    seen = set()
    for t in topics:
        if not isinstance(t, dict):
            continue
        label = str(t.get("label", "")).strip()
        if not label:
            continue
        # max 6 words
        words = label.split()
        if len(words) > 6:
            label = " ".join(words[:6])
        label_key = label.lower()

        cat = str(t.get("category", "concept")).strip().lower()
        cat = _CAT_MAP.get(cat, cat)
        if cat not in _ALLOWED:
            cat = "concept"

        typ = str(t.get("type", "mentioned")).strip().lower()
        typ = "prerequisite" if typ == "prereq" else typ
        if typ not in {"mentioned", "prerequisite"}:
            typ = "mentioned"

        try:
            conf = float(t.get("confidence", 0.7))
        except Exception:
            conf = 0.7
        conf = max(0.0, min(1.0, conf))

        rationale = str(t.get("rationale", "")).strip()
        if not rationale:
            rationale = "Key concept referenced or required by the paper."

        sig = (label_key, cat, typ)
        if sig in seen:
            continue
        seen.add(sig)

        norm.append({
            "label": label,
            "category": cat,
            "type": typ,
            "confidence": conf,
            "rationale": rationale
        })

    # Prefer 12–20 if possible
    if len(norm) >= 12:
        return norm[:20]
    return norm


# ------------ Wire actions ------------
known_actions = {
    "find_paper_id": find_paper_id,
    "return_text": return_text,
    "return_core_text": return_core_text,
}

action_re = re.compile(r'^Action: (\w+): (.*)$')

# ------------ Driver ------------


def _id_like(s: str) -> Optional[str]:
    m = re.search(r"(\d{4}\.\d{4,5}(v\d+)?)", s)
    return m.group(1) if m else None


def _save_topics_array(text: str, current_id: Optional[str]) -> Optional[pathlib.Path]:
    topics = _extract_json_array(text)
    topics = _normalize_topics(topics)
    if not topics:
        return None
    TOPICS_DIR.mkdir(parents=True, exist_ok=True)
    fname_id = (current_id or "paper")
    out_path = TOPICS_DIR / f"{fname_id}.topics.json"
    out_path.write_text(json.dumps(
        topics, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def query(question, max_turns=5):
    i = 0
    bot = Agent(prompt)
    next_prompt = question
    current_id: Optional[str] = None  # track arxiv id for saving topics
    while i < max_turns:
        i += 1
        result = bot(next_prompt)
        # may include Thought/Action/PAUSE... or final JSON (sometimes fenced)
        print(result)

        actions = [action_re.match(a) for a in result.split(
            '\n') if action_re.match(a)]
        if actions:
            action, action_input = actions[0].groups()
            action_input = action_input.strip()
            if action not in known_actions:
                raise Exception(f"Unknown action: {action}: {action_input}")

            # try to capture id early
            if action != "find_paper_id":
                guess = _id_like(action_input)
                if guess:
                    current_id = guess

            print(f" -- running {action} {action_input}")
            observation = known_actions[action](action_input)

            # capture id from observation if it looks like one
            if action == "find_paper_id" and isinstance(observation, str):
                current_id = _id_like(observation) or observation.strip()

            # Hide long core text in console
            if isinstance(observation, str) and (
                "[ABSTRACT]" in observation or "[INTRODUCTION]" in observation or len(
                    observation) > 600
            ):
                print("Observation: <core text loaded>")
            else:
                print("Observation:", observation)

            next_prompt = f"Observation: {observation}"
        else:
            # No action lines => attempt to save final topics array
            out_path = _save_topics_array(result, current_id)
            if out_path:
                print(f"Saved topics to {out_path}")
            else:
                print("Final output was not valid JSON array; nothing saved.")
            return


if __name__ == "__main__":
    question = """Extract topics for why language models hallucinate."""
    query(question)
