import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import DashboardPage from '../DashboardPage'

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      userId: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      createdAt: '2023-01-01T00:00:00Z',
    },
    logout: vi.fn(),
    loading: false,
  }),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with user information', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('MindMap')).toBeInTheDocument()
    expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add content/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('displays knowledge graph placeholder', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('Your Knowledge Graph')).toBeInTheDocument()
    expect(screen.getByText(/Your graph visualization will appear here/)).toBeInTheDocument()
  })

  it('opens add content modal when button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<DashboardPage />)
    
    const addContentButton = screen.getByRole('button', { name: /add content/i })
    await user.click(addContentButton)
    
    expect(screen.getByText('Add Content')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add content/i })).toBeInTheDocument()
  })

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<DashboardPage />)
    
    // Open modal
    const addContentButton = screen.getByRole('button', { name: /add content/i })
    await user.click(addContentButton)
    
    // Verify modal is open
    expect(screen.getByText('Add Content')).toBeInTheDocument()
    
    // Close modal
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText('Add Content')).not.toBeInTheDocument()
    })
  })

  it('closes modal when X button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<DashboardPage />)
    
    // Open modal
    const addContentButton = screen.getByRole('button', { name: /add content/i })
    await user.click(addContentButton)
    
    // Verify modal is open
    expect(screen.getByText('Add Content')).toBeInTheDocument()
    
    // Close modal with X button
    const closeButton = screen.getByText('✕')
    await user.click(closeButton)
    
    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText('Add Content')).not.toBeInTheDocument()
    })
  })

  it('handles form input in add content modal', async () => {
    const user = userEvent.setup()
    
    render(<DashboardPage />)
    
    // Open modal
    const addContentButton = screen.getByRole('button', { name: /add content/i })
    await user.click(addContentButton)
    
    // Fill form
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(titleInput, 'Test Content')
    await user.type(descriptionInput, 'This is a test description')
    
    expect(titleInput).toHaveValue('Test Content')
    expect(descriptionInput).toHaveValue('This is a test description')
  })

  it('calls logout when logout button is clicked', async () => {
    const user = userEvent.setup()
    const mockLogout = vi.fn()
    
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: {
        userId: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: '2023-01-01T00:00:00Z',
      },
      logout: mockLogout,
      loading: false,
    })
    
    render(<DashboardPage />)
    
    const logoutButton = screen.getByRole('button', { name: /logout/i })
    await user.click(logoutButton)
    
    expect(mockLogout).toHaveBeenCalled()
  })
}) 