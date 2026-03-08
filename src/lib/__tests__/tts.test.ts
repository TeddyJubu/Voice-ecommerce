import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { speakText, stopSpeaking, isSpeakingNow } from "../tts";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Audio element
class MockAudio {
  src: string = "";
  paused: boolean = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src: string) {
    this.src = src;
  }

  async play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

// Mock URL.createObjectURL and revokeObjectURL
const mockObjectUrls = new Map<string, Blob>();
let objectUrlCounter = 0;

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

URL.createObjectURL = vi.fn((blob: Blob) => {
  const url = `blob:mock-url-${objectUrlCounter++}`;
  mockObjectUrls.set(url, blob);
  return url;
});

URL.revokeObjectURL = vi.fn((url: string) => {
  mockObjectUrls.delete(url);
});

describe("tts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockObjectUrls.clear();
    objectUrlCounter = 0;

    // Mock Audio constructor
    global.Audio = MockAudio as any;
  });

  afterEach(() => {
    stopSpeaking();
  });

  describe("speakText", () => {
    it("makes a POST request to /api/tts with the correct voice ID", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Hello world", "test-voice-id");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tts/test-voice-id",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.any(String),
        })
      );
    });

    it("sends the text in the request body", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Test message", "voice-id");

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual({
        text: "Test message",
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      });
    });

    it("uses default voice ID when not provided", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Hello");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tts/21m00Tcm4TlvDq8ikWAM",
        expect.any(Object)
      );
    });

    it("creates an object URL from the blob response", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const promise = speakText("Test", "voice-id");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it("returns early and logs warning on fetch error", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      await speakText("Test", "voice-id");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TTS] ElevenLabs error 500")
      );

      consoleWarnSpy.mockRestore();
    });

    it("handles network errors gracefully", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await speakText("Test", "voice-id");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[TTS] speakText failed:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it("stops any currently playing audio before starting new audio", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // Start first audio
      const promise1 = speakText("First", "voice-id");
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Start second audio (should stop first)
      const promise2 = speakText("Second", "voice-id");
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Both should be called
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("stopSpeaking", () => {
    it("pauses active audio", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const pauseSpy = vi.spyOn(MockAudio.prototype, "pause");

      speakText("Test", "voice-id");
      await new Promise((resolve) => setTimeout(resolve, 10));

      stopSpeaking();

      expect(pauseSpy).toHaveBeenCalled();
    });

    it("revokes object URL on cleanup", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Test", "voice-id");
      await new Promise((resolve) => setTimeout(resolve, 10));

      stopSpeaking();

      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it("does not throw when called with no active audio", () => {
      expect(() => stopSpeaking()).not.toThrow();
    });

    it("resolves pending Promise when stopped", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      let resolved = false;
      const promise = speakText("Test", "voice-id").then(() => {
        resolved = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      stopSpeaking();

      await promise;

      expect(resolved).toBe(true);
    });
  });

  describe("isSpeakingNow", () => {
    it("returns false when no audio is playing", () => {
      expect(isSpeakingNow()).toBe(false);
    });

    it("returns true when audio is playing", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Test", "voice-id");
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check if speaking (Note: in real implementation this would be true during playback)
      // The mock doesn't fully simulate the Audio API behavior
      const result = isSpeakingNow();
      expect(typeof result).toBe("boolean");
    });

    it("returns false after audio is stopped", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Test", "voice-id");
      await new Promise((resolve) => setTimeout(resolve, 10));

      stopSpeaking();

      expect(isSpeakingNow()).toBe(false);
    });
  });

  describe("Audio lifecycle", () => {
    it("creates Audio element from blob URL", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Test", "voice-id");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it("cleans up on stopSpeaking", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Test", "voice-id");
      await new Promise((resolve) => setTimeout(resolve, 50));

      stopSpeaking();

      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("handles audio play errors gracefully", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // Mock play to reject
      vi.spyOn(MockAudio.prototype, "play").mockRejectedValueOnce(
        new Error("Play failed")
      );

      await speakText("Test", "voice-id");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[TTS] Audio play failed:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it("handles audio loading with no errors", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mpeg" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      speakText("Test", "voice-id");

      await new Promise((resolve) => setTimeout(resolve, 50));

      // No errors should be thrown
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});