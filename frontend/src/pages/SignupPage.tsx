import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const { signup } = useAuth()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    try {
      await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      })
    } catch (err) {
      setError('Failed to create account')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-notion-bg">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-notion-text">Create your account</h1>
          <p className="mt-2 text-notion-text-secondary">Start building your knowledge graph</p>
        </div>
        
        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-notion">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-notion-text">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="input-field mt-1"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-notion-text">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="input-field mt-1"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            
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
                value={formData.email}
                onChange={handleChange}
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
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-notion-text">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input-field mt-1"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full"
            >
              Create account
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-notion-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-notion-primary hover:text-blue-600">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 