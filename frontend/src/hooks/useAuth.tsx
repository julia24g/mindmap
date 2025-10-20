import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { gql, useMutation } from '@apollo/client'
import { User, AuthResponse, LoginCredentials, SignupCredentials } from '@/types'

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        userId
        firstName
        lastName
        email
        createdAt
      }
      token
    }
  }
`

const SIGNUP_MUTATION = gql`
  mutation CreateUser($firstName: String!, $lastName: String!, $email: String!, $password: String!) {
    createUser(firstName: $firstName, lastName: $lastName, email: $email, password: $password) {
      user {
        userId
        firstName
        lastName
        email
        createdAt
      }
      token
    }
  }
`

interface AuthContextType {
  user: User | null
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (credentials: SignupCredentials) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [loginMutation] = useMutation<{ login: AuthResponse }>(LOGIN_MUTATION)
  const [signupMutation] = useMutation<{ createUser: AuthResponse }>(SIGNUP_MUTATION)

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('authToken')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      const { data } = await loginMutation({ variables: credentials })
      if (data?.login) {
        const { user, token } = data.login
        setUser(user)
        localStorage.setItem('authToken', token)
        localStorage.setItem('user', JSON.stringify(user))
        navigate('/')
      }
    } catch (error) {
      throw new Error('Login failed')
    }
  }

  const signup = async (credentials: SignupCredentials) => {
    try {
      const { data } = await signupMutation({ variables: credentials })
      if (data?.createUser) {
        const { user, token } = data.createUser
        setUser(user)
        localStorage.setItem('authToken', token)
        localStorage.setItem('user', JSON.stringify(user))
        navigate('/')
      }
    } catch (error) {
      throw new Error('Signup failed')
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
