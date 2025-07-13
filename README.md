# MindMap - Personal Knowledge Graph

A comprehensive personal knowledge management system that combines GraphQL APIs, graph databases, and AI-powered content tagging to create an intelligent knowledge graph.

## 🏗️ Project Structure

```
mindmap/
├── backend/
│   ├── graphql-server/           # Main GraphQL API server
│   │   ├── src/
│   │   │   ├── auth.ts          # JWT authentication & authorization
│   │   │   ├── db/
│   │   │   │   ├── postgres.ts  # PostgreSQL connection & queries
│   │   │   │   └── neo4j.ts     # Neo4j graph database connection
│   │   │   ├── index.ts         # Server entry point
│   │   │   ├── resolvers.ts     # GraphQL resolvers
│   │   │   ├── schema.ts        # GraphQL schema definitions
│   │   │   └── utils.ts         # Utility functions (data mapping)
│   │   ├── tests/
│   │   │   ├── graphql.test.ts  # Unit tests for resolvers
│   │   │   └── integration.test.ts # Integration tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── llm-tagging-service/     # AI-powered content tagging service
│       ├── main.py              # FastAPI service for tag generation
│       ├── requirements.txt
│       ├── tests/
│       │   └── test_app.py
│       └── Dockerfile
│
├── database/
│   └── postgres-init.sql        # PostgreSQL initialization script
│
├── frontend/                    # React frontend (to be implemented)
│
├── docker-compose.yml           # Multi-service container orchestration
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## 🚀 Features

### Backend Services
- **GraphQL API Server** (Node.js/TypeScript)
  - User authentication & authorization (JWT)
  - Content management (CRUD operations)
  - Knowledge graph queries
  - User management (registration, login, profile updates)
  - Automatic content tagging via AI

- **LLM Tagging Service** (Python/FastAPI)
  - AI-powered content analysis
  - Automatic tag generation
  - Integration with GraphQL server

### Database Architecture
- **PostgreSQL**: User data, content metadata, authentication
- **Neo4j**: Knowledge graph relationships, tags, content connections

### Security & Testing
- JWT-based authentication
- Password hashing with bcrypt
- Comprehensive unit tests
- Integration tests with real databases
- Input validation and error handling

## 🛠️ Setup & Installation

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.8+ (for LLM service development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mindmap
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose --env-file .env up -d --build
   ```

4. **Access the services**
   - GraphQL API: http://localhost:4000/graphql
   - Neo4j Browser: http://localhost:7474
   - PostgreSQL: localhost:5432
   - LLM Service: http://localhost:8000

### Development Setup

1. **Install dependencies**
   ```bash
   cd backend/graphql-server
   npm install
   
   cd ../llm-tagging-service
   pip install -r requirements.txt
   ```

2. **Run tests**
   ```bash
   # Unit tests
   cd backend/graphql-server
   npm test
   
   # Integration tests
   npm run test:integration
   ```

## 📊 API Documentation

### GraphQL Schema

#### Queries
- `get_user_graph(userId: ID!)`: Retrieve user's knowledge graph
- `content(contentId: ID!)`: Get specific content
- `getContentByTag(userId: ID!, tagName: String!)`: Get content by tag
- `get_all_tags`: Get all available tags
- `getUser(userId: ID!)`: Get user profile
- `getUserByEmail(email: String!)`: Get user by email
- `getAllUsers`: Get all users

#### Mutations
- `addContent(userId: ID!, title: String!, type: String, properties: JSON)`: Create new content
- `updateContent(contentId: ID!, title: String, type: String, properties: JSON)`: Update content
- `deleteContent(contentId: ID!)`: Delete content
- `createUser(firstName: String!, lastName: String!, email: String!, password: String!)`: Register user
- `login(email: String!, password: String!)`: User authentication
- `updateUser(userId: ID!, firstName: String, lastName: String, email: String)`: Update user profile
- `deleteUser(userId: ID!)`: Delete user account
- `changePassword(userId: ID!, currentPassword: String!, newPassword: String!)`: Change password

### Authentication
- JWT tokens for API access
- Password hashing with bcrypt
- Protected routes require authentication

## 🧪 Testing

### Test Structure
- **Unit Tests**: Individual resolver testing with mocked dependencies
- **Integration Tests**: Full API testing with real databases

# Service URLs
GRAPHQL_ENDPOINT=http://localhost:4000/graphql
LLM_SERVICE_URL=http://localhost:8000
```

## 🐳 Docker Commands

### Start Services
```bash
docker-compose --env-file .env up -d --build
```

### Stop Services
```bash
docker-compose --env-file .env down -v
```
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization

---

**Note**: This is a work in progress. The frontend React application is planned for future development.
