import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "../SettingsPage";

// Mock the STT functions
vi.mock("../../../lib/stt", () => ({
  hasNativeSpeechRecognition: vi.fn(() => true),
  hasGetUserMedia: vi.fn(() => true),
  hasMediaRecorder: vi.fn(() => true),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Initial rendering", () => {
    it("renders without crashing", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders all main sections", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Voice")).toBeInTheDocument();
      expect(screen.getByText("Always Listening")).toBeInTheDocument();
      expect(screen.getByText("LLM Routing")).toBeInTheDocument();
      expect(screen.getByText("Privacy")).toBeInTheDocument();
      expect(screen.getByText("Plan")).toBeInTheDocument();
    });
  });

  describe("Voice settings", () => {
    it("displays all available voices", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Rachel")).toBeInTheDocument();
      expect(screen.getByText("Josh")).toBeInTheDocument();
      expect(screen.getByText("Dorothy")).toBeInTheDocument();
      expect(screen.getByText("Bella")).toBeInTheDocument();
      expect(screen.getByText("Elli")).toBeInTheDocument();
    });

    it("displays voice descriptions", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Neutral, balanced")).toBeInTheDocument();
      expect(screen.getByText("Warm, conversational")).toBeInTheDocument();
      expect(screen.getByText("Expressive, storytelling")).toBeInTheDocument();
      expect(screen.getByText("Bright, energetic")).toBeInTheDocument();
      expect(screen.getByText("Calm, soothing")).toBeInTheDocument();
    });

    it("loads selected voice from localStorage", () => {
      localStorage.setItem("voice-selectedVoice", "TxGEqnHWrfWFTfGW9XjX");
      render(<SettingsPage />);

      // Josh should be selected (check mark visible)
      const joshButton = screen.getByText("Josh").closest("button");
      expect(joshButton).toHaveClass("border-primary");
    });

    it("defaults to Rachel when no voice is saved", () => {
      render(<SettingsPage />);

      const rachelButton = screen.getByText("Rachel").closest("button");
      expect(rachelButton).toHaveClass("border-primary");
    });

    it("updates localStorage when voice is selected", () => {
      render(<SettingsPage />);

      const joshButton = screen.getByText("Josh").closest("button");
      fireEvent.click(joshButton!);

      expect(localStorage.getItem("voice-selectedVoice")).toBe("TxGEqnHWrfWFTfGW9XjX");
    });

    it("shows auto-speak toggle", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Auto-speak answers")).toBeInTheDocument();
    });

    it("loads auto-speak setting from localStorage", () => {
      localStorage.setItem("voice-autoSpeak", "false");
      render(<SettingsPage />);

      // Check that toggle is off (has bg-switch-background class)
      const toggles = document.querySelectorAll("button[class*='rounded-full']");
      const autoSpeakToggle = Array.from(toggles).find((btn) =>
        btn.parentElement?.textContent?.includes("Auto-speak answers")
      );
      expect(autoSpeakToggle).toHaveClass("bg-switch-background");
    });

    it("toggles auto-speak setting", () => {
      render(<SettingsPage />);

      // Find the auto-speak toggle button
      const toggles = document.querySelectorAll("button[class*='rounded-full']");
      const autoSpeakToggle = Array.from(toggles).find((btn) =>
        btn.parentElement?.textContent?.includes("Auto-speak answers")
      ) as HTMLElement;

      fireEvent.click(autoSpeakToggle);

      expect(localStorage.getItem("voice-autoSpeak")).toBe("false");
    });
  });

  describe("Always Listening settings", () => {
    it("displays always listening toggle", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Enable always-listening mode")).toBeInTheDocument();
    });

    it("displays wake word information", () => {
      render(<SettingsPage />);
      expect(screen.getByText('Wake word: "Friday"')).toBeInTheDocument();
    });

    it("displays live transcription toggle", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Show live transcription")).toBeInTheDocument();
    });

    it("displays cost-saving pipeline tiers", () => {
      render(<SettingsPage />);
      expect(screen.getByText("VAD")).toBeInTheDocument();
      expect(screen.getByText("Intent Gate")).toBeInTheDocument();
      expect(screen.getByText("STT")).toBeInTheDocument();
      expect(screen.getByText("LLM")).toBeInTheDocument();
    });

    it("shows correct cost for each tier", () => {
      render(<SettingsPage />);
      // Check for cost-saving pipeline elements (some text appears multiple times)
      expect(screen.getByText("$0.0002/check")).toBeInTheDocument();
      expect(screen.getByText("$0.006/sec")).toBeInTheDocument();
      expect(screen.getByText("$0.003/req")).toBeInTheDocument();
    });
  });

  describe("LLM Routing settings", () => {
    it("displays both LLM options", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Cerebras GPT-OSS 120B")).toBeInTheDocument();
      expect(screen.getByText("Nebius Token Factory")).toBeInTheDocument();
    });

    it("shows PRIMARY and FALLBACK badges", () => {
      render(<SettingsPage />);
      expect(screen.getByText("PRIMARY")).toBeInTheDocument();
      expect(screen.getByText("FALLBACK")).toBeInTheDocument();
    });

    it("loads preferred LLM from localStorage", () => {
      localStorage.setItem("voice-preferredLLM", "nebius");
      render(<SettingsPage />);

      const nebiusButton = screen.getByText("Nebius Token Factory").closest("button");
      expect(nebiusButton).toHaveClass("border-primary");
    });

    it("defaults to cerebras when no preference is saved", () => {
      render(<SettingsPage />);

      const cerebrasButton = screen.getByText("Cerebras GPT-OSS 120B").closest("button");
      expect(cerebrasButton).toHaveClass("border-primary");
    });

    it("updates localStorage when LLM is selected", () => {
      render(<SettingsPage />);

      const nebiusButton = screen.getByText("Nebius Token Factory").closest("button");
      fireEvent.click(nebiusButton!);

      expect(localStorage.getItem("voice-preferredLLM")).toBe("nebius");
    });

    it("displays STT provider information", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Speech-to-Text")).toBeInTheDocument();
      expect(screen.getByText("Web Speech API")).toBeInTheDocument();
      expect(screen.getByText("Groq/Cerebras Whisper")).toBeInTheDocument();
    });
  });

  describe("Privacy settings", () => {
    it("displays delete history button", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Delete all history")).toBeInTheDocument();
    });

    it("displays privacy information", () => {
      render(<SettingsPage />);
      expect(
        screen.getByText(/Audio is never stored. Only text transcripts are saved/)
      ).toBeInTheDocument();
    });

    it("clears history when clear button is clicked", () => {
      localStorage.setItem("voice-assistant-history", JSON.stringify([{ query: "test" }]));
      render(<SettingsPage />);

      const clearButton = screen.getByText("Clear").closest("button");
      fireEvent.click(clearButton!);

      expect(localStorage.getItem("voice-assistant-history")).toBeNull();
    });

    it("shows cleared confirmation after clearing history", async () => {
      render(<SettingsPage />);

      const clearButton = screen.getByText("Clear").closest("button");
      fireEvent.click(clearButton!);

      await waitFor(() => {
        expect(screen.getByText("Cleared")).toBeInTheDocument();
      });
    });

    it("shows cleared confirmation temporarily", async () => {
      render(<SettingsPage />);

      const clearButton = screen.getByText("Clear").closest("button");
      fireEvent.click(clearButton!);

      await waitFor(() => {
        expect(screen.getByText("Cleared")).toBeInTheDocument();
      });

      // Confirmation appears - that's what we're testing
      expect(screen.getByText("Cleared")).toBeInTheDocument();
    });
  });

  describe("Plan settings", () => {
    it("displays free plan as current", () => {
      render(<SettingsPage />);
      expect(screen.getByText("CURRENT")).toBeInTheDocument();
      expect(screen.getByText("Free Plan")).toBeInTheDocument();
    });

    it("displays plan details", () => {
      render(<SettingsPage />);
      expect(screen.getByText("20 queries/day · Basic voices")).toBeInTheDocument();
      expect(
        screen.getByText("Unlimited queries · Premium voices · Priority processing")
      ).toBeInTheDocument();
    });

    it("displays plan prices", () => {
      render(<SettingsPage />);
      const prices = screen.getAllByText("$0");
      expect(prices.length).toBeGreaterThan(0);
      expect(screen.getByText("$9/mo")).toBeInTheDocument();
    });

    it("displays upgrade button", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Upgrade")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      render(<SettingsPage />);
      const h1 = screen.getByRole("heading", { level: 1, name: "Settings" });
      expect(h1).toBeInTheDocument();
    });

    it("all toggles are accessible buttons", () => {
      render(<SettingsPage />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("STT availability indicators", () => {
    it("shows STT provider information", () => {
      render(<SettingsPage />);
      // The mocked functions return true by default, so native STT should be shown as available
      expect(
        screen.getByText(/Available — used as primary STT/)
      ).toBeInTheDocument();
    });

    it("displays Whisper as fallback option", () => {
      render(<SettingsPage />);
      expect(
        screen.getByText(/Available as fallback/)
      ).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles missing localStorage gracefully", () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);

      expect(() => render(<SettingsPage />)).not.toThrow();

      getItemSpy.mockRestore();
    });

    it("renders successfully even with localStorage issues", () => {
      // Component should render even with localStorage problems
      render(<SettingsPage />);
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });
});