from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, validator
from typing import List, Optional
from transformers import pipeline
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport

# Initialize FastAPI
app = FastAPI()

# LLM pipeline
tagger = pipeline("text-generation", model="gpt2")

# GraphQL setup
GRAPHQL_ENDPOINT = "http://localhost:4000/graphql"

transport = RequestsHTTPTransport(url=GRAPHQL_ENDPOINT, verify=True, retries=3)
client = Client(transport=transport, fetch_schema_from_transport=False)

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
    result = client.execute(query, variable_values={"limit": limit}) # Sends query to GraphQL server
    return result["allTags"]

def suggest_tags(text: str, existing_tags: List[str]) -> List[str]:
    prompt = (
        f"Given this event:\n\n{text}\n\n"
        f"And this list of existing tags:\n{', '.join(existing_tags)}\n\n"
        "Suggest 1 to 5 relevant tags for the event. "
        "Prefer tags from the list if they fit well. "
        "If none apply, create new concise lowercase tags. "
        "Do not force tags—only suggest as many as are truly relevant and unique. "
        "Avoid redundant or highly similar tags. "
        "If the event is a book, podcast, article, movie, or any content that can be found online, "
        "search the web for that title and use the information you find to help pick the most relevant tags. "
        "Return the tags as a comma-separated list.\n"
        "Tags:"
    )
    result = tagger(prompt, max_new_tokens=20, do_sample=True)[0]["generated_text"]
    lines = result.split("Tags:")[-1].strip().split(",")
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