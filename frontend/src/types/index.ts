export interface User {
  userId: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
  updatedAt?: string
}

export interface Content {
  contentId: string
  userId: string
  title: string
  type?: string
  created_at: string
  properties?: Record<string, any>
}

export interface Node {
  id: string
  label: string
  contentId?: string
  name?: string
}

export interface Edge {
  from: string
  to: string
  type: string
}

export interface UserGraph {
  nodes: Node[]
  edges: Edge[]
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  firstName: string
  lastName: string
  email: string
  password: string
} 