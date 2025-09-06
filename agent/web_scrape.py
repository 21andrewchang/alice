from openai import OpenAI
from urllib.parse import urlencode, quote_plus
import openai
import re
import httpx
import os
from dotenv import load_dotenv
import urllib.request as libreq
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
import html as html_unescape
from typing import Optional
from bs4 import BeautifulSoup

_ = load_dotenv()
client = OpenAI()
chat_completion = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello world"}]
)


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
            temperature=0,
            messages=self.messages)
        return completion.choices[0].message.content


prompt = """
You run in a loop of Thought, Action, PAUSE, Observation.
At the end of the loop you output an Answer
Use Thought to describe your thoughts about the question you have been asked.
Use Action to run one of the actions available to you - then return PAUSE.
Observation will be the result of running those actions.

Your available actions are:

return_text:
e.g. return_text:
processes the html and returns the paper content in plaintext

find_paper_id:
e.g. find_paper_id: robotics
returns a list of research papers form arxiv about robotics.

Example session:

Question: Can you show me a paper on SmolVLA?
Thought: I should look for a paper on SmolVLA using find_paper_id.
Action: find_paper_id: SmolVLA
PAUSE

You will be called again with this:

Observation: id of SmolVLA paper on arxiv

You then output:

Answer: a list of urls

OUTPUT REQUIREMENTS:
Please keep output tokens as low as possible to save on api costs.
Responses MUST be extremely short and only include necessary content.
""".strip()


def return_text(id):
    return (id)


def find_paper_id(query: str) -> Optional[str]:
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


known_actions = {
    "return_text": return_text,
    "find_paper_id": find_paper_id
}


action_re = re.compile('^Action: (\w+): (.*)$')


def query(question, max_turns=5):
    i = 0
    bot = Agent(prompt)
    next_prompt = question
    while i < max_turns:
        i += 1
        result = bot(next_prompt)
        print(result)
        actions = [
            action_re.match(a)
            for a in result.split('\n')
            if action_re.match(a)
        ]
        if actions:
            # There is an action to run
            action, action_input = actions[0].groups()
            if action not in known_actions:
                raise Exception(
                    "Unknown action: {}: {}".format(action, action_input))
            print(" -- running {} {}".format(action, action_input))
            observation = known_actions[action](action_input)
            print("Observation:", observation)
            next_prompt = "Observation: {}".format(observation)
        else:
            return


question = """Can you show me a paper on SmolVLA?"""
query(question)
