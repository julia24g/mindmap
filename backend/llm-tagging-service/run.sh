#!/bin/bash

# Run the LLM tagging service locally
cd "$(dirname "$0")"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
