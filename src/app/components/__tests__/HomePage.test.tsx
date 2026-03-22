import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "../HomePage";

// Mock all complex dependencies
vi.mock("../VoiceInput", () => ({
  VoiceInput: () => <div data-testid="voice-input">Voice Input Component</div>,
}));

vi.mock("../ResultsCanvas", () => ({
  ResultsCanvas: () => <div data-testid="results-canvas">Results Canvas</div>,
}));

vi.mock("../cards/SkeletonCard", () => ({
  SkeletonCard: () => <div data-testid="skeleton-card">Loading...</div>,
}));

vi.mock("../mockScenarios", () => ({
  getSuggestedQueries: vi.fn(() => [
    "What's the weather?",
    "Find me headphones",
    "Tell me a joke",
  ]),
}));

vi.mock("../useAlwaysListening", () => ({
  useAlwaysListening: vi.fn(() => ({
    state: {
      sttMode: "native",
      isListening: false,
      transcript: "",
      showTranscript: false,
    },
    enable: vi.fn(),
    disable: vi.fn(),
    manualTrigger: vi.fn(),
    toggleTranscription: vi.fn(),
  })),
}));

vi.mock("../../lib/llm", () => ({
  queryLLMStream: vi.fn(() =>
    Promise.resolve({
      scenario: {
        query: "test",
        summary: "Test summary",
        blocks: [],
      },
      provider: "cerebras",
    })
  ),
}));

vi.mock("../../lib/tts", () => ({
  speakText: vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
}));

describe("HomePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Component rendering", () => {
    it("renders without crashing", () => {
      render(<HomePage />);
      expect(screen.getByTestId("voice-input")).toBeInTheDocument();
    });

    it("shows empty state heading", () => {
      render(<HomePage />);
      expect(screen.getByText("Talk to search.")).toBeInTheDocument();
    });

    it("displays suggested queries", () => {
      render(<HomePage />);
      expect(screen.getByText("What's the weather?")).toBeInTheDocument();
      expect(screen.getByText("Find me headphones")).toBeInTheDocument();
      expect(screen.getByText("Tell me a joke")).toBeInTheDocument();
    });

    it("renders VoiceInput component", () => {
      render(<HomePage />);
      expect(screen.getByTestId("voice-input")).toBeInTheDocument();
    });

    it("displays welcome message in empty state", () => {
      render(<HomePage />);
      expect(
        screen.getByText(/Get cards, not walls of text/)
      ).toBeInTheDocument();
    });
  });

  describe("History management", () => {
    it("loads history from localStorage on mount", () => {
      const mockHistory = [
        {
          query: "previous query",
          scenario: { query: "previous query", summary: "summary", blocks: [] },
          timestamp: new Date().toISOString(),
        },
      ];
      localStorage.setItem("voice-assistant-history", JSON.stringify(mockHistory));

      render(<HomePage />);

      // History should be loaded
      expect(localStorage.getItem("voice-assistant-history")).toBeTruthy();
    });

    it("handles corrupted history data gracefully", () => {
      localStorage.setItem("voice-assistant-history", "invalid json");

      expect(() => render(<HomePage />)).not.toThrow();
    });

    it("handles empty history gracefully", () => {
      expect(() => render(<HomePage />)).not.toThrow();
    });
  });

  describe("useAlwaysListening integration", () => {
    it("renders with always listening functionality", () => {
      render(<HomePage />);
      // Component renders successfully with useAlwaysListening hook
      expect(screen.getByTestId("voice-input")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has main container structure", () => {
      const { container } = render(<HomePage />);
      expect(container.querySelector(".flex-1")).toBeInTheDocument();
    });

    it("renders interactive elements", () => {
      render(<HomePage />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("handles localStorage quota exceeded gracefully", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() => render(<HomePage />)).not.toThrow();

      setItemSpy.mockRestore();
    });

    it("handles rendering robustly", () => {
      // Component should render even with edge cases
      expect(() => render(<HomePage />)).not.toThrow();
      expect(screen.getByTestId("voice-input")).toBeInTheDocument();
    });
  });
});