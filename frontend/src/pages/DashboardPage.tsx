import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [showAddContent, setShowAddContent] = useState(false)

  return (
    <div className="min-h-screen bg-notion-bg">
      {/* Header */}
      <header className="bg-white border-b border-notion-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-notion-text">MindMap</h1>
            <div className="text-notion-text-secondary">
              Welcome, {user?.firstName} {user?.lastName}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddContent(true)}
              className="btn-primary"
            >
              Add Content
            </button>
            <button
              onClick={logout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-notion shadow-notion p-8">
            <h2 className="text-2xl font-semibold text-notion-text mb-4">
              Your Knowledge Graph
            </h2>
            <p className="text-notion-text-secondary">
              Your graph visualization will appear here. Click "Add Content" to start building your knowledge graph.
            </p>
          </div>
        </div>
      </main>

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-notion shadow-notion-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-notion-text">Add Content</h3>
              <button
                onClick={() => setShowAddContent(false)}
                className="text-notion-text-secondary hover:text-notion-text"
              >
                ✕
              </button>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-notion-text mb-1">
                  Title
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter content title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-notion-text mb-1">
                  Description
                </label>
                <textarea
                  className="input-field min-h-[100px] resize-none"
                  placeholder="Describe your content"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setShowAddContent(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Add Content
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 