import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./DashboardPage";
import { useAuthContext } from "@/contexts/AuthContext";
import { useGetUserGraph } from "@/api/getUserGraph";

// Mock only API calls and responses
vi.mock("@/contexts/AuthContext");
vi.mock("@/api/getUserGraph");

// Mock AddContent to simplify testing
vi.mock("@/components/AddContent", () => ({
  default: ({ onContentAdded }: { onContentAdded: () => void }) => (
    <div data-testid="add-content">
      <button onClick={onContentAdded}>Add Content</button>
    </div>
  ),
}));

describe("DashboardPage", () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dashboard title", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders AddContent component", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);
    expect(screen.getByTestId("add-content")).toBeInTheDocument();
  });

  it("shows loading state when data is loading", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: true,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error state when there is an error", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: false,
      error: new Error("Failed to fetch graph"),
      refetch: mockRefetch,
    });

    render(<DashboardPage />);
    expect(
      screen.getByText("Error loading graph: Failed to fetch graph"),
    ).toBeInTheDocument();
  });

  it("shows empty state when there is no graph data", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: { nodes: [], edges: [] },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);
    expect(screen.getByText("No Knowledge Graph Yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You haven't added any content yet. Get started by adding your first piece of content above.",
      ),
    ).toBeInTheDocument();
  });

  it("renders ReactFlow when there is graph data", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    const mockGraph = {
      nodes: [
        { id: "1", label: "content", name: "Node 1", contentId: "content-1" },
        { id: "2", label: "tag", name: "Tag 1" },
      ],
      edges: [{ from: "1", to: "2", type: "TAGGED_WITH" }],
    };

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: mockGraph,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    // Should render ReactFlow and not show empty state
    expect(
      screen.queryByText("No Knowledge Graph Yet"),
    ).not.toBeInTheDocument();
  });

  it("does not show empty state when there is graph data", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    const mockGraph = {
      nodes: [{ id: "1", label: "content", name: "Node 1" }],
      edges: [],
    };

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: mockGraph,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(
      screen.queryByText("No Knowledge Graph Yet"),
    ).not.toBeInTheDocument();
  });

  it("calls refetch when content is added", async () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    const addButton = screen.getByText("Add Content");
    addButton.click();

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it("uses currentUser uid to fetch graph", () => {
    const testUid = "test-user-123";
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: testUid } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(useGetUserGraph).toHaveBeenCalledWith(testUid);
  });

  it("handles missing currentUser gracefully", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: null,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(useGetUserGraph).toHaveBeenCalledWith("");
  });

  it("renders graph with multiple nodes and edges", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    const mockGraph = {
      nodes: [
        { id: "1", label: "content", name: "Article 1", contentId: "c1" },
        { id: "2", label: "tag", name: "JavaScript" },
        { id: "3", label: "tag", name: "React" },
      ],
      edges: [
        { from: "1", to: "2", type: "TAGGED_WITH" },
        { from: "1", to: "3", type: "TAGGED_WITH" },
      ],
    };

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: mockGraph,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(
      screen.queryByText("No Knowledge Graph Yet"),
    ).not.toBeInTheDocument();
  });

  it("handles null graph data", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: undefined,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    // Should show empty state
    expect(screen.getByText("No Knowledge Graph Yet")).toBeInTheDocument();
  });

  it("handles rerenders correctly", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-uid" } as any,
      loading: false,
    });

    const mockGraph = {
      nodes: [{ id: "1", label: "content", name: "Node 1" }],
      edges: [],
    };

    vi.mocked(useGetUserGraph).mockReturnValue({
      graph: mockGraph,
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    const { rerender } = render(<DashboardPage />);

    // Rerender with same graph data
    rerender(<DashboardPage />);

    // The component should handle rerenders without errors
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
