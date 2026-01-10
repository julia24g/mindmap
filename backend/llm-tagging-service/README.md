# LLM Tagging Service

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up `.env` file with:
```
HF_TOKEN=your_huggingface_token
GRAPHQL_ENDPOINT=http://localhost:4000/graphql
```

3. Run the service:
```bash
./run.sh
```

The service will be available at `http://localhost:8000`
