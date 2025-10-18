import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/utils'
import ProtectedRoute from '../ProtectedRoute'

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}))

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: {
        userId: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: '2023-01-01T00:00:00Z',
      },
      loading: false,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: null,
      loading: true,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: null,
      loading: false,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should not render the protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
}) 