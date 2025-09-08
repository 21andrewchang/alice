# react_node_seeder.py
from __future__ import annotations

import os
import re
import json
import time
import random
import argparse
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

# =============================
# Environment & Config
# =============================
load_dotenv()

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
NODES_TABLE = os.getenv("NODES_TABLE", "nodes")

client = OpenAI()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# =============================
# Helpers
# =============================


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return re.sub(r"^-+|-+$", "", s)


def extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    """Extract first JSON object from text (strips fences if present)."""
    s = text.strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", s, flags=re.S | re.I)
    if m:
        s = m.group(1).strip()
    m2 = re.search(r"\{.*\}", s, flags=re.S)
    if not m2:
        return None
    try:
        obj = json.loads(m2.group(0))
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


DOMAIN_SET = {"ai", "math", "tech"}


def canonical_domain(s: str) -> str:
    k = (s or "").strip().lower()
    if k in DOMAIN_SET:
        return k
    # light heuristics
    if any(w in k for w in ["math", "stat", "probab"]):
        return "math"
    if any(w in k for w in ["tech", "software", "systems", "eng"]):
        return "tech"
    return "ai"


def backoff_sleep(i: int):
    time.sleep(min(30, (2 ** i) + random.random()))

# =============================
# ReAct Agent
# =============================


class Agent:
    def __init__(self, system: str = ""):
        self.messages: List[Dict[str, str]] = []
        if system:
            self.messages.append({"role": "system", "content": system})

    def __call__(self, message: str) -> str:
        self.messages.append({"role": "user", "content": message})
        out = self.execute()
        self.messages.append({"role": "assistant", "content": out})
        return out

    def observe(self, observation: str) -> str:
        self.messages.append(
            {"role": "user", "content": f"Observation: {observation}"})
        out = self.execute()
        self.messages.append({"role": "assistant", "content": out})
        return out

    def execute(self) -> str:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=self.messages
        )
        return resp.choices[0].message.content


# Permissive action line parser:
ACTION_RE = re.compile(r"^Action:\s*([A-Za-z_][\w-]*)\s*:?\s*(.*)$", re.M)

# =============================
# Tool: create_node
# =============================

NODE_SYSTEM_FOR_TOOL = """You generate a single learning node as STRICT JSON (no fences, no extra prose).
Target schema:
{
  "id": int,                       // caller provides; echo back unchanged
  "label": string,                 // canonical topic title
  "type": "concept",
  "description": string,           // MARKDOWN ONLY (see style below)
  "difficulty": 0|1|2,             // 0 = intro, 1 = intermediate, 2 = advanced
  "domain": string                 // e.g., ai, math, tech, hardware, physics, biology, chemistry
}

Markdown STYLE GUIDELINES (MUST FOLLOW):
- DO NOT include the topic title in the description. Do NOT start with '#'.
- Start directly with '## What it is', then sections like:
  '## How it works', '## Key equations', '## Example', '## Why it matters',
  '## Pitfalls', '## Further reading'.
- Use '-' for bullet lists (line-start hyphen). Do NOT use '•'.
- Use inline math $...$ and display math $$...$$ when relevant.
- Use **bold** for short emphasis, `code` for identifiers.
- Keep content reusable, textbook-quality, not tied to a single paper.
- Be concise but complete; avoid vendor/product specifics.

Content Hints:
- "What it is": clear, 2–4 sentences.
- "How it works": 3–7 bullets (mechanics, assumptions, variants).
- "Key equations" (optional): canonical LaTeX + 1–2 sentence explanations.
- "Example": short, generic example.
- "Pitfalls": 3–5 common mistakes/failures.
- "Further reading": 3–5 canonical sources (books/chapters/surveys/tutorials; no URLs required).

Output ONLY a single JSON object.
"""


def tool_create_node(topic: str, node_id: int) -> str:
    """Ask the model to return a single JSON node for the topic."""
    user = f"""Create a learning node.

id: {node_id}
label: {topic}

IMPORTANT:
- type must be "concept".
- domain must be one of: ai, math, tech.
- difficulty defaults to 0 unless clearly 1 or 2.
- Output ONLY one JSON object, no code fences, no extra text."""
    for attempt in range(5):
        try:
            resp = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": NODE_SYSTEM_FOR_TOOL},
                    {"role": "user", "content": user},
                ]
            )
            return resp.choices[0].message.content
        except Exception:
            if attempt == 4:
                raise
            backoff_sleep(attempt)
    return "{}"


def run_action_create_node(arg: str) -> str:
    """
    Parse arg "<topic>|<id>" (or "<topic> <id>") and call the tool.
    """
    raw = arg.strip()
    parts = [p.strip()
             for p in (raw.split("|") if "|" in raw else raw.split())]
    if len(parts) < 2:
        raise ValueError("create_node requires '<topic>|<id>'")
    topic = parts[0]
    try:
        node_id = int(parts[1])
    except Exception:
        node_id = 1
    return tool_create_node(topic, node_id)


KNOWN_ACTIONS = {
    "create_node": run_action_create_node
}

# =============================
# ReAct System Prompt
# =============================

SYSTEM_PROMPT = """
You run in a loop of Thought, Action, PAUSE, Observation.
At the end, OUTPUT ONLY a RAW JSON OBJECT of the node (no prose, no fences). If you cannot comply, output {}.

Use Thought to reason briefly.
Use Action to run an available tool, then return PAUSE.
Observation will be the tool result.

GOAL
Given a topic, produce a single high-quality learning node JSON suitable for direct insertion into our DB.

AVAILABLE ACTIONS
- create_node: <topic>|<id>|<type>|<domain>|<difficulty>
  → Generates a strict JSON node for the topic using our markdown style.

OUTPUT FORMAT (RAW JSON ONLY)
{
  "id": int,
  "label": string,
  "type": "concept",
  "description": string (markdown),
  "difficulty": 0|1|2,
  "domain": string
}

REQUIREMENTS
- Use canonical naming for label.
- Produce reusable, textbook-grade material (not paper-specific).
- The description MUST NOT repeat the label or start with a top-level '#'.
- The description MUST start with '## What it is', then use '##' section headers, '-' bullets, and math $...$/$$...$$ when relevant.
- No code fences, no extra commentary—only the JSON object as the final Answer.
""".strip()

# =============================
# Validation & DB
# =============================


def validate_node(obj: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Ensure final shape:
    {
      "id": int,
      "label": str,
      "type": "concept",
      "description": str (markdown),
      "difficulty": 0|1|2,
      "domain": "ai"|"math"|"tech"
    }
    Fill defaults & canonicalize where possible.
    """
    if not isinstance(obj, dict):
        return None

    # Must-have fields
    if not all(k in obj for k in ["id", "label", "description"]):
        return None

    try:
        obj["id"] = int(obj["id"])
    except Exception:
        return None

    obj["label"] = str(obj["label"]).strip()
    if not obj["label"]:
        return None

    desc = str(obj.get("description", "")).strip()
    if not desc:
        return None

    # Force canonical constraints
    obj["type"] = "concept"
    obj["description"] = desc

    try:
        obj["difficulty"] = max(0, min(2, int(obj.get("difficulty", 0))))
    except Exception:
        obj["difficulty"] = 0

    obj["domain"] = canonical_domain(obj.get("domain", "ai"))

    # Optionally strip unknown keys:
    allowed = {"id", "label", "type", "description", "difficulty", "domain"}
    obj = {k: obj[k] for k in allowed}

    return obj


def approve_loop(node: Dict[str, Any]) -> bool:
    print("\n================= NODE PREVIEW =================")
    print(
        f"Label: {node['label']}  |  Type: {node['type']}  |  Domain: {node['domain']}  |  Difficulty: {node['difficulty']}")
    print("--------------- Description (markdown) ---------")
    print(node["description"])
    print("------------------------------------------------")
    ans = input("Approve this node? [y/N] ").strip().lower()
    return ans in {"y", "yes"}


def upsert_node(node: Dict[str, Any]):
    payload = {
        "label": node["label"],
        "type": node["type"],
        "domain": node["domain"],
        "difficulty": node["difficulty"],
        "description": node["description"],
    }
    res = supabase.table(NODES_TABLE).insert(
        payload).execute()
    # Optional: print(res)

# =============================
# Orchestration
# =============================


def run_agent_for_topic(topic: str, node_id: int) -> Optional[Dict[str, Any]]:
    agent = Agent(SYSTEM_PROMPT)
    q = f"Create a node for topic: {topic}\nUse the tool and then give the final JSON."
    # First call – expect ReAct with Action line
    text = agent(q)
    print(text)

    m = ACTION_RE.search(text.strip())
    if not m:
        # Fallback: force tool call then observe
        observation = run_action_create_node(f"{topic}|{node_id}")
        text2 = agent.observe(observation)
        print(text2)
        obj = extract_json_object(text2)
        return validate_node(obj) if obj else None

    action, args = m.groups()
    if action not in KNOWN_ACTIONS:
        # Fallback if it invented a tool name
        observation = run_action_create_node(f"{topic}|{node_id}")
        text2 = agent.observe(observation)
        print(text2)
        obj = extract_json_object(text2)
        return validate_node(obj) if obj else None

    # If args missing id, supply it
    if "|" not in args or len([x for x in args.split("|") if x.strip()]) < 2:
        args = f"{topic}|{node_id}"

    print(f" -- running {action}: {args}")
    observation = KNOWN_ACTIONS[action](args)

    # Feed observation back for final Answer
    text2 = agent.observe(observation)
    print(text2)

    obj = extract_json_object(text2)
    return validate_node(obj) if obj else None


def load_topics(path: Optional[str]) -> List[str]:
    if not path:
        return [
            "Machine Learning",
            "Supervised Learning",
            "Unsupervised Learning",
            "Self-Supervised Learning",
            "Semi-Supervised Learning",
            "Transfer Learning",
            "Representation Learning",
            "Generative Modeling",
            "Discriminative Modeling",
            "Multimodal Learning",
            "Metric Learning",
            "Dimensionality Reduction",
            "Anomaly Detection",
            "Clustering",
            "Out-of-Distribution Detection",
            "Causal Inference",
            "Domain Adaptation",
            "Continual Learning",
            "Meta-Learning",
            "Active Learning",
            "Neural Networks",
            "Backpropagation",
            "Stochastic Gradient Descent",
            "Momentum Methods",
            "Adam Optimizer",
            "Learning Rate Schedules",
            "Batch Normalization",
            "Layer Normalization",
            "Dropout",
            "Weight Decay",
            "Residual Networks",
            "Convolutional Neural Networks",
            "Recurrent Neural Networks",
            "Long Short-Term Memory",
            "Gated Recurrent Units",
            "Attention Mechanisms",
            "Transformers",
            "Sequence-to-Sequence Models",
            "Encoder-Decoder Architecture",
            "Graph Neural Networks",
            "Autoencoders",
            "Variational Autoencoders",
            "Generative Adversarial Networks",
            "Normalizing Flows",
            "Diffusion Models",
            "Score-Based Generative Models",
            "Mixture-of-Experts",
            "Retrieval-Augmented Generation",
            "Prompt Tuning",
            "Instruction Tuning",
            "Reinforcement Learning from Human Feedback",
            "Direct Preference Optimization",
            "Knowledge Distillation",
            "Model Pruning",
            "Quantization",
            "Low-Rank Adaptation",
            "Parameter-Efficient Fine-Tuning",
            "Multitask Learning",
            "Curriculum Learning",
            "Contrastive Learning",
            "Image Classification",
            "Object Detection",
            "Semantic Segmentation",
            "Instance Segmentation",
            "Pose Estimation",
            "Optical Flow",
            "3D Reconstruction",
            "Neural Radiance Fields",
            "Video Understanding",
            "Self-Supervised Vision",
            "Vision Transformers",
            "Image Captioning",
            "Visual Question Answering",
            "Vision-Language Models",
            "Language Modeling",
            "Tokenization",
            "Word Embeddings",
            "Contextual Embeddings",
            "Machine Translation",
            "Summarization",
            "Question Answering",
            "Dialogue Systems",
            "Alignment and Safety",
            "LLM Evaluation",
            "Prompt Engineering",
            "Tool Use in LLMs",
            "Markov Decision Process",
            "Partially Observable MDPs",
            "Reinforcement Learning",
            "Value Function Approximation",
            "Bellman Optimality Equation",
            "Dynamic Programming",
            "Monte Carlo Methods",
            "Temporal-Difference Learning",
            "SARSA",
            "Q-learning",
            "Deep Q-Networks",
            "Double DQN",
            "Dueling Networks",
            "Prioritized Experience Replay",
            "Policy Gradient Methods",
            "Actor-Critic Methods",
            "Advantage Estimation",
            "Trust Region Policy Optimization",
            "Proximal Policy Optimization",
            "Soft Actor-Critic",
            "Deterministic Policy Gradient",
            "Twin Delayed DDPG",
            "Model-Based Reinforcement Learning",
            "World Models",
            "Planning with Learned Models",
            "Offline Reinforcement Learning",
            "Batch-Constrained RL",
            "Imitation Learning",
            "Behavioral Cloning",
            "Inverse Reinforcement Learning",
            "Reward Shaping",
            "Exploration Strategies",
            "Intrinsic Motivation",
            "Multi-Agent Reinforcement Learning",
            "Hierarchical Reinforcement Learning",
            "Options Framework",
            "Safe Reinforcement Learning",
            "Risk-Sensitive Reinforcement Learning",
            "Off-Policy Evaluation",
            "Regret Minimization",
            "Probability Theory",
            "Random Variables",
            "Expectation and Variance",
            "Covariance and Correlation",
            "Law of Large Numbers",
            "Central Limit Theorem",
            "Bayesian Inference",
            "Maximum Likelihood Estimation",
            "Bayesian Networks",
            "Markov Chains",
            "Information Theory",
            "Entropy and KL Divergence",
            "Mutual Information",
            "Linear Algebra",
            "Matrix Decompositions",
            "Eigenvalues and Eigenvectors",
            "Singular Value Decomposition",
            "Principal Component Analysis",
            "Spectral Methods",
            "Norms and Regularization",
            "Convex Optimization",
            "Lagrangian Duality",
            "Subgradient Methods",
            "Proximal Algorithms",
            "Stochastic Optimization",
            "Variational Inference",
            "Expectation-Maximization",
            "Gaussian Processes",
            "Kernel Methods",
            "Reproducing Kernel Hilbert Spaces",
            "Concentration Inequalities",
            "Rademacher Complexity",
            "PAC Learning",
            "VC Dimension",
            "Generalization Bounds",
            "Online Convex Optimization",
            "Bandit Algorithms",
            "Markov Chain Monte Carlo",
            "Hamiltonian Monte Carlo",
            "Numerical Linear Algebra",
            "Cross-Entropy Loss",
            "Mean Squared Error",
            "Huber Loss",
            "ROC and AUC",
            "Precision and Recall",
            "F1 Score",
            "Calibration",
            "Perplexity",
            "BLEU Score",
            "ROUGE Score",
            "Mean Average Precision",
            "Normalized Discounted Cumulative Gain",
            "Brier Score",
            "Cumulative Reward",
            "Expected Regret",
            "Data Versioning",
            "Feature Stores",
            "Experiment Tracking",
            "Model Evaluation Pipelines",
            "A/B Testing",
            "Offline-Online Validation",
            "Model Serving",
            "Streaming Inference",
            "Batch Inference",
            "Model Monitoring",
            "Concept Drift Detection",
            "Feedback Loops",
            "CI/CD for ML",
            "Reproducibility",
            "PyTorch",
            "TensorFlow",
            "JAX",
            "ONNX and Model Export",
            "CUDA Programming",
            "Distributed Data Parallel",
            "Model Parallelism",
            "Pipeline Parallelism",
            "Checkpointing",
            "Mixed Precision Training",
            "Vector Databases",
            "Approximate Nearest Neighbors",
            "Retrieval Systems",
            "Prompt Orchestration",
            "Safety and Guardrails",
            "Differential Privacy",
            "GPU Architecture",
            "CUDA Cores and Tensor Cores",
            "Memory Bandwidth",
            "High-Bandwidth Memory",
            "Host-Device Transfer",
            "TPU Architecture",
            "Quantization-Friendly Hardware",
            "Energy-Efficient Inference",
            "Edge AI Accelerators",
            "NUMA Architectures",
        ]

    with open(path, "r", encoding="utf-8") as f:
        return [ln.strip() for ln in f if ln.strip()]


def main():
    parser = argparse.ArgumentParser(
        description="Batch-generate learning nodes and upsert to Supabase.")
    parser.add_argument("--topics-file", type=str, default=None,
                        help="Path to a file with one topic per line.")
    parser.add_argument("--start-id", type=int, default=1,
                        help="Starting integer id for nodes.")
    parser.add_argument("--auto-approve", action="store_true",
                        help="Skip interactive approval and insert automatically.")
    args = parser.parse_args()

    topics = load_topics(args.topics_file)
    next_id = args.start_id

    for t in topics:
        print(f"\n=== Generating node for: {t} (id={next_id}) ===")
        node = run_agent_for_topic(topic=t, node_id=next_id)
        if not node:
            print(f"[skip] Could not generate a valid node for: {t}")
            continue

        if args.auto_approve or approve_loop(node):
            upsert_node(node)
            print(
                f"[ok] Inserted: {node['label']} (slug={slugify(node['label'])})")
            next_id += 1
        else:
            print(f"[rejected] Skipped: {node['label']}")


if __name__ == "__main__":
    main()
