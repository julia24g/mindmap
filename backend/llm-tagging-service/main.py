from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, validator
from typing import List, Optional
import os
from dotenv import load_dotenv
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport
from huggingface_hub import InferenceClient
from openai import OpenAI

# Initialize FastAPI
app = FastAPI()
load_dotenv()

model_name = "meta-llama/Llama-3.2-3B-Instruct"

HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN not found in environment. Please set it as an environment variable or in .env file")

# Initialize Hugging Face Inference Client
ai_client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.environ["HF_TOKEN"],
)

def tagger(prompt: str, max_new_tokens: int = 20) -> str:
    """Call Hugging Face Inference API for text generation using chat completions.

    Returns the generated text as a string.
    """
    completion = ai_client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=max_new_tokens,
    )
    return completion.choices[0].message.content

# GraphQL setup
GRAPHQL_ENDPOINT = os.getenv("GRAPHQL_ENDPOINT")

transport = RequestsHTTPTransport(url=GRAPHQL_ENDPOINT, verify=True, retries=3)
graphql_client = Client(transport=transport, fetch_schema_from_transport=False)

# Defines expected input structure
class TagInput(BaseModel):
    title: str
    description: Optional[str] = ""
    
    @validator('title')
    def validate_title(cls, v):
        if not v or v.strip() == "":
            raise ValueError("Title cannot be empty")
        return v

# Call to GraphQL to fetch existing tags
def fetch_tags_from_graphql(limit=500) -> List[str]:
    # GraphQL query
    query = gql(
        """
        query GetTags($limit: Int) {
            allTags(limit: $limit)
        }
        """
    )
    result = graphql_client.execute(query, variable_values={"limit": int(limit)}) # Sends query to GraphQL server
    return result["allTags"]

def suggest_tags(text: str, existing_tags: List[str]) -> List[str]:
    existing_tags_text = f"And this list of existing tags:\n{', '.join(existing_tags)}\n\n" if existing_tags else ""
    prompt = (
        f"Given this reflection:\n\n{text}\n\n"
        f"{existing_tags_text}"
        "Suggest 1 to 5 relevant tags for the reflection. "
        f"{'Prefer tags from the list if they fit well. If none apply, create new concise lowercase tags. ' if existing_tags else 'Create new concise lowercase tags. '}"
            "Tagging rules:\n"
        "- Tags must represent meaningful topics, themes, or concepts expressed by the reflection.\n"
        "- Tags should be interpretive but grounded in the content.\n"
        "- Prefer reusing tags from the existing list if they fit well.\n\n"

        "Strict constraints (do NOT violate these):\n"
        "- Do NOT create tags derived from the reflection title or its wording.\n"
        "- Do NOT include content-type tags (e.g., podcast, book, film, article).\n"
        "- Do NOT use vague or placeholder tags such as general, general-interest, misc, other, or similar.\n"
        "- Do NOT force tags; return fewer tags rather than adding generic ones.\n\n"

        "Additional guidance:\n"
        "- It is acceptable to return only 1 or 2 strong tags if those best capture the reflection.\n"
        "- Avoid redundant or highly overlapping tags.\n"
        "- All tags must be concise, lowercase, and semantically meaningful.\n\n"

        "IMPORTANT: Output ONLY the tags as a comma-separated list with NO explanations, NO introductory text, and NO additional commentary. Just the tags.\n"
    )
    result = tagger(prompt, max_new_tokens=50)
    # Extract tags from the response
    if "Tags:" in result:
        lines = result.split("Tags:")[-1].strip().split(",")
    else:
        # Fallback: try to extract comma-separated values from the response
        lines = result.strip().split(",")
    return [tag.strip() for tag in lines if tag.strip()]

@app.post("/suggest-tags")
async def suggest_tags_endpoint(event: TagInput):
    try:
        description = event.description or ""
        context_text = f"{event.title}. {description}"
        existing_tags = fetch_tags_from_graphql()
        suggestions = suggest_tags(context_text, existing_tags)
        return {"suggested_tags": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))