from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
import os
import json
import logging
from dotenv import load_dotenv
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport
from openai import OpenAI

app = FastAPI()
load_dotenv()

# Logging setup
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("llm_tagging_service")

# -----------------------------
# OpenAI setup
# -----------------------------
openai_client = OpenAI()

TAVILY_REMOTE_MCP_URL = os.getenv("TAVILY_REMOTE_MCP_URL")
if not TAVILY_REMOTE_MCP_URL:
    logger.error("Missing env var TAVILY_REMOTE_MCP_URL")
    raise RuntimeError("Missing env var TAVILY_REMOTE_MCP_URL")

# -----------------------------
# GraphQL setup
# -----------------------------
GRAPHQL_ENDPOINT = os.getenv("GRAPHQL_ENDPOINT")
if not GRAPHQL_ENDPOINT:
    logger.error("Missing env var GRAPHQL_ENDPOINT")
    raise RuntimeError("Missing env var GRAPHQL_ENDPOINT")

transport = RequestsHTTPTransport(url=GRAPHQL_ENDPOINT, verify=True, retries=3)
graphql_client = Client(transport=transport, fetch_schema_from_transport=False)


def fetch_tags_from_graphql(limit: int = 500) -> List[str]:
    logger.info("fetch_tags_from_graphql called", extra={"limit": limit})
    query = gql(
        """
        query GetTags($limit: Int) {
            allTags(limit: $limit)
        }
        """
    )
    result = graphql_client.execute(query, variable_values={"limit": int(limit)})
    tags = result.get("allTags", []) or []
    logger.info("Fetched tags from GraphQL", extra={"count": len(tags)})
    return tags


# -----------------------------
# API input model
# -----------------------------
class TagInput(BaseModel):
    title: str
    notes: Optional[str] = ""

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or v.strip() == "":
            raise ValueError("Title cannot be empty")
        return v


# -----------------------------
# OpenAI tagging (single call)
# -----------------------------
SYSTEM_PROMPT = """
You are an entity-aware tagging agent for personal notes.

Your task:
1) Parse the note text and extract any entities that require external lookup
   (books, movies, TV shows, articles, authors, directors, publications).
2) For each entity:
   - If sufficient metadata is already known with high confidence, do NOT search.
   - Otherwise, call the Tavily search tool to resolve the entity.
3) Use Tavily results to infer:
   - canonical title
   - type (book, movie, article, etc.)
   - year (if applicable)
   - creator (author, director)
   - genres/topics
   - canonical reference URL (prefer Wikipedia, IMDb, Goodreads).
4) Using the resolved metadata AND the note text, generate normalized tags.

Rules:
- Use Tavily search only when metadata is missing or ambiguous.
- Use at most ONE Tavily search call per entity.
- Prefer trusted sources: wikipedia.org, imdb.com, goodreads.com.
- Do NOT invent facts. If uncertain, lower confidence.
- Return ONLY valid JSON matching the output schema.
"""

# Output contract: stable JSON so you don't parse "comma lists" anymore
OUTPUT_SCHEMA_INSTRUCTIONS = """
Return a single JSON object with this exact structure:

{
  "entities": [
    {
      "inputText": string,
      "kind": "book" | "movie" | "article" | "tv" | "person" | "other",
      "resolved": {
        "canonicalTitle": string,
        "year": number | null,
        "creator": string | null,
        "genres": string[],
        "topics": string[],
        "referenceUrl": string | null
      },
      "confidence": number
    }
  ],
  "suggestedTags": string[]
}

Tag constraints (do NOT violate):
- Suggest 1 to 5 tags.
- Tags must represent meaningful topics/themes/concepts expressed by the note.
- Prefer tags from the provided existingTags list if they fit well.
- If none apply, create new concise lowercase tags.
- DO NOT create tags derived from the note title or its wording.
- DO NOT include content-type tags (e.g., podcast, book, film, article).
- DO NOT use vague tags: general, general-interest, misc, other, etc.
- Avoid redundant/highly overlapping tags.
- Output ONLY JSON (no markdown, no commentary).
"""


def _safe_parse_json(text: str) -> Dict[str, Any]:
    """
    Best-effort JSON parse. If the model ever returns extra text,
    this attempts to extract the first top-level JSON object.
    """
    text = text.strip()

    # Fast path
    try:
        return json.loads(text)
    except Exception:
        logger.debug("Fast JSON parse failed, attempting extraction")

    # Try to extract first {...} block
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except Exception:
            logger.debug("Extraction-based JSON parse failed")

    logger.error("Model did not return valid JSON")
    raise ValueError("Model did not return valid JSON.")


def suggest_tags_with_openai(note_text: str, existing_tags: List[str]) -> Dict[str, Any]:
    """
    One OpenAI call:
    - extract entities
    - (optionally) call Tavily MCP search
    - return entities + suggestedTags JSON
    """
    user_prompt = f"""
Note text:
\"\"\"
{note_text}
\"\"\"

existingTags:
{existing_tags}
"""

    logger.info(
        "Calling OpenAI to suggest tags",
        extra={
            "note_length": len(note_text),
            "existing_tags_count": len(existing_tags),
        },
    )

    resp = openai_client.responses.create(
        model="gpt-5-nano",
        tools=[
            {
                "type": "mcp",
                "server_label": "tavily",
                "server_url": TAVILY_REMOTE_MCP_URL,
                "require_approval": "never",
            }
        ],
        input=[
            {"role": "system", "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]},
            {
                "role": "system",
                "content": [{"type": "input_text", "text": OUTPUT_SCHEMA_INSTRUCTIONS}],
            },
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
    )

    # Responses API can return multiple output items; we want the final text
    # Commonly: resp.output_text is available; fallback to scanning output.
    output_text = getattr(resp, "output_text", None)
    if not output_text:
        # Fallback: find any text content in resp.output
        chunks = []
        for item in getattr(resp, "output", []) or []:
            for c in getattr(item, "content", []) or []:
                if c.get("type") == "output_text" and "text" in c:
                    chunks.append(c["text"])
        output_text = "\n".join(chunks).strip()

    try:
        parsed = _safe_parse_json(output_text)
    except Exception as e:
        logger.exception("Failed to parse OpenAI output as JSON")
        raise

    # Normalize suggestedTags
    tags = parsed.get("suggestedTags", []) or []
    if not isinstance(tags, list):
        tags = []

    # Clean tags: lowercase + trim + dedupe while preserving order
    seen = set()
    cleaned = []
    for t in tags:
        if not isinstance(t, str):
            continue
        tt = t.strip().lower()
        if not tt:
            continue
        if tt in seen:
            continue
        seen.add(tt)
        cleaned.append(tt)

    parsed["suggestedTags"] = cleaned
    logger.info(
        "OpenAI returned suggested tags",
        extra={"suggested_count": len(cleaned), "suggested": cleaned[:5]},
    )
    return parsed


# -----------------------------
# Endpoint
# -----------------------------
@app.post("/suggest-tags")
async def suggest_tags_endpoint(event: TagInput):
    try:
        notes = event.notes or ""

        # Avoid logging full note content; log lengths and title presence
        logger.info(
            "Received suggest-tags request",
            extra={"title": event.title, "notes_length": len(notes)},
        )

        note_text = f"{event.title}\n\n{notes}".strip()

        existing_tags = fetch_tags_from_graphql(limit=500)

        result = suggest_tags_with_openai(note_text, existing_tags)

        suggested = result.get("suggestedTags", [])
        logger.info(
            "Returning suggested tags",
            extra={"count": len(suggested), "sample": suggested[:5]},
        )

        return {
            "suggested_tags": suggested,
            "entities": result.get("entities", []),
        }
    except Exception as e:
        logger.exception("Unhandled error in suggest-tags endpoint")
        raise HTTPException(status_code=500, detail=str(e))
