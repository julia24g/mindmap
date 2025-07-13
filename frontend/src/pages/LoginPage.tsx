import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      await login({ email, password })
    } catch (err) {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-notion-bg">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-notion-text">Welcome back</h1>
          <p className="mt-2 text-notion-text-secondary">Sign in to your MindMap account</p>
        </div>
        
        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-notion">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-notion-text">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-notion-text">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full"
            >
              Sign in
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-notion-text-secondary">
              Don't have an account?{' '}
              <Link to="/signup" className="text-notion-primary hover:text-blue-600">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 