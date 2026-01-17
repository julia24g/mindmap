import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentForm from "./ContentForm";
import { useAddContent } from "@/api/addContent";
import { useAuthContext } from "@/contexts/AuthContext";

// Mock the hooks
vi.mock("@/api/addContent");
vi.mock("@/contexts/AuthContext");

describe("ContentForm", () => {
  const mockAddContent = vi.fn();
  const mockReset = vi.fn();
  const mockOnContentAdded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(useAddContent).mockReturnValue({
      addContent: mockAddContent,
      data: undefined,
      loading: false,
      error: undefined,
    });

    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: { uid: "test-user-123" } as any,
      loading: false,
    });
  });

  it("renders the form with all fields", () => {
    render(<ContentForm />);

    expect(
      screen.getByText(/use the form below to add new content/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("allows user to type in the title field", async () => {
    const user = userEvent.setup();
    render(<ContentForm />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Book Title");

    expect(titleInput).toHaveValue("Test Book Title");
  });

  it("submits the form with correct data", async () => {
    const user = userEvent.setup();
    mockAddContent.mockResolvedValue({ data: { addContent: {} } });

    render(<ContentForm />);

    // Fill in the title
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Book Title");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalledWith({
        variables: {
          firebaseUid: "test-user-123",
          title: "Test Book Title",
          type: undefined,
        },
      });
    });
  });

  it("calls onContentAdded callback after successful submission", async () => {
    const user = userEvent.setup();
    mockAddContent.mockResolvedValue({ data: { addContent: {} } });

    render(<ContentForm onContentAdded={mockOnContentAdded} />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Book");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnContentAdded).toHaveBeenCalled();
    });
  });

  it("does not call onContentAdded if not provided", async () => {
    const user = userEvent.setup();
    mockAddContent.mockResolvedValue({ data: { addContent: {} } });

    render(<ContentForm />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Book");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // Just ensure it doesn't throw an error
    await waitFor(() => {
      expect(mockAddContent).toHaveBeenCalled();
    });
  });

  it("disables form fields when loading", () => {
    vi.mocked(useAddContent).mockReturnValue({
      addContent: mockAddContent,
      data: undefined,
      loading: true,
      error: undefined,
    });

    render(<ContentForm />);

    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(titleInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("handles submission error gracefully", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockAddContent.mockRejectedValue(new Error("Network error"));

    render(<ContentForm />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Book");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error adding content:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("throws error when user is not authenticated", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(useAuthContext).mockReturnValue({
      currentUser: null,
      loading: false,
    });

    render(<ContentForm />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Book");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error adding content:",
        expect.objectContaining({ message: "User not authenticated" }),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("logs success message after successful submission", async () => {
    const user = userEvent.setup();
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockAddContent.mockResolvedValue({ data: { addContent: {} } });

    render(<ContentForm />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Book");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith("Content added successfully!");
    });

    consoleLogSpy.mockRestore();
  });

  it("has select field for content type", () => {
    render(<ContentForm />);

    // Verify the select trigger is present
    const typeSelect = screen.getByRole("combobox");
    expect(typeSelect).toBeInTheDocument();
    expect(screen.getByText(/select content type/i)).toBeInTheDocument();
  });
});
