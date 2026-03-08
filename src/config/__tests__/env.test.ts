import { describe, it, expect, beforeEach, vi } from "vitest";
import { CEREBRAS, NEBIUS, GROQ, ELEVENLABS, DEEPGRAM, CEREBRAS_WHISPER, POLLINATIONS, OPEN_METEO, STT_PROVIDER, LLM_PRIMARY, CEREBRAS_AVAILABILITY_THRESHOLD, COST } from "../env";

describe("env configuration", () => {
  describe("CEREBRAS", () => {
    it("has required configuration fields", () => {
      expect(CEREBRAS).toHaveProperty("apiKey");
      expect(CEREBRAS).toHaveProperty("baseUrl");
      expect(CEREBRAS).toHaveProperty("model");
    });

    it("has default baseUrl", () => {
      expect(CEREBRAS.baseUrl).toBe("https://api.cerebras.ai/v1");
    });

    it("has default model", () => {
      expect(CEREBRAS.model).toBe("gpt-oss-120b");
    });
  });

  describe("NEBIUS", () => {
    it("has required configuration fields", () => {
      expect(NEBIUS).toHaveProperty("apiKey");
      expect(NEBIUS).toHaveProperty("baseUrl");
      expect(NEBIUS).toHaveProperty("model");
    });

    it("has default baseUrl", () => {
      expect(NEBIUS.baseUrl).toBe("https://api.tokenfactory.nebius.com/v1/");
    });

    it("has default model", () => {
      expect(NEBIUS.model).toBe("Qwen/Qwen2.5-72B-Instruct-fast");
    });
  });

  describe("GROQ", () => {
    it("has required configuration fields", () => {
      expect(GROQ).toHaveProperty("apiKey");
      expect(GROQ).toHaveProperty("baseUrl");
      expect(GROQ).toHaveProperty("model");
    });

    it("has default baseUrl", () => {
      expect(GROQ.baseUrl).toBe("https://api.groq.com/openai/v1");
    });

    it("has default whisper model", () => {
      expect(GROQ.model).toBe("whisper-large-v3-turbo");
    });
  });

  describe("ELEVENLABS", () => {
    it("has required configuration fields", () => {
      expect(ELEVENLABS).toHaveProperty("sttWsUrl");
      expect(ELEVENLABS).toHaveProperty("ttsWsUrl");
      expect(ELEVENLABS).toHaveProperty("voiceId");
    });

    it("has default STT WebSocket URL", () => {
      expect(ELEVENLABS.sttWsUrl).toBe("wss://api.elevenlabs.io/v1/speech-to-text/stream");
    });

    it("has default TTS WebSocket URL", () => {
      expect(ELEVENLABS.ttsWsUrl).toBe("wss://api.elevenlabs.io/v1/text-to-speech/stream");
    });

    it("has default voice ID (Rachel)", () => {
      expect(ELEVENLABS.voiceId).toBe("21m00Tcm4TlvDq8ikWAM");
    });
  });

  describe("DEEPGRAM", () => {
    it("has required configuration fields", () => {
      expect(DEEPGRAM).toHaveProperty("apiKey");
      expect(DEEPGRAM).toHaveProperty("wsUrl");
    });

    it("has default WebSocket URL", () => {
      expect(DEEPGRAM.wsUrl).toBe("wss://api.deepgram.com/v1/listen");
    });
  });

  describe("CEREBRAS_WHISPER", () => {
    it("has model field", () => {
      expect(CEREBRAS_WHISPER).toHaveProperty("model");
    });

    it("has default model", () => {
      expect(CEREBRAS_WHISPER.model).toBe("whisper-large-v3");
    });
  });

  describe("POLLINATIONS", () => {
    it("has required configuration fields", () => {
      expect(POLLINATIONS).toHaveProperty("textBaseUrl");
      expect(POLLINATIONS).toHaveProperty("imageBaseUrl");
      expect(POLLINATIONS).toHaveProperty("searchModel");
      expect(POLLINATIONS).toHaveProperty("imageModel");
      expect(POLLINATIONS).toHaveProperty("apiKey");
    });

    it("has default text base URL", () => {
      expect(POLLINATIONS.textBaseUrl).toBe("https://text.pollinations.ai/openai");
    });

    it("has default image base URL", () => {
      expect(POLLINATIONS.imageBaseUrl).toBe("https://image.pollinations.ai");
    });

    it("has default search model", () => {
      expect(POLLINATIONS.searchModel).toBe("openai");
    });

    it("has default image model", () => {
      expect(POLLINATIONS.imageModel).toBe("z-image-turbo");
    });

    it("has empty API key by default", () => {
      expect(POLLINATIONS.apiKey).toBe("");
    });
  });

  describe("OPEN_METEO", () => {
    it("has baseUrl field", () => {
      expect(OPEN_METEO).toHaveProperty("baseUrl");
    });

    it("has default base URL", () => {
      expect(OPEN_METEO.baseUrl).toBe("https://api.open-meteo.com/v1");
    });
  });

  describe("Pipeline configuration", () => {
    it("has STT_PROVIDER with valid value", () => {
      expect(["elevenlabs", "deepgram", "groq", "cerebras"]).toContain(STT_PROVIDER);
    });

    it("has LLM_PRIMARY with valid value", () => {
      expect(["cerebras", "nebius"]).toContain(LLM_PRIMARY);
    });

    it("has CEREBRAS_AVAILABILITY_THRESHOLD as a number between 0 and 1", () => {
      expect(typeof CEREBRAS_AVAILABILITY_THRESHOLD).toBe("number");
      expect(CEREBRAS_AVAILABILITY_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(CEREBRAS_AVAILABILITY_THRESHOLD).toBeLessThanOrEqual(1);
    });

    it("has default CEREBRAS_AVAILABILITY_THRESHOLD of 0.9", () => {
      expect(CEREBRAS_AVAILABILITY_THRESHOLD).toBe(0.9);
    });
  });

  describe("Cost model", () => {
    it("has all required cost fields", () => {
      expect(COST).toHaveProperty("sttPerSecond");
      expect(COST).toHaveProperty("gatePerCheck");
      expect(COST).toHaveProperty("cerebrasPerReq");
      expect(COST).toHaveProperty("nebiusPerReq");
    });

    it("has numeric cost values", () => {
      expect(typeof COST.sttPerSecond).toBe("number");
      expect(typeof COST.gatePerCheck).toBe("number");
      expect(typeof COST.cerebrasPerReq).toBe("number");
      expect(typeof COST.nebiusPerReq).toBe("number");
    });

    it("has positive cost values", () => {
      expect(COST.sttPerSecond).toBeGreaterThan(0);
      expect(COST.gatePerCheck).toBeGreaterThan(0);
      expect(COST.cerebrasPerReq).toBeGreaterThan(0);
      expect(COST.nebiusPerReq).toBeGreaterThan(0);
    });

    it("has expected default cost values", () => {
      expect(COST.sttPerSecond).toBe(0.006);
      expect(COST.gatePerCheck).toBe(0.0002);
      expect(COST.cerebrasPerReq).toBe(0.003);
      expect(COST.nebiusPerReq).toBe(0.004);
    });
  });

  describe("Configuration objects are typed as const", () => {
    it("CEREBRAS exports are defined", () => {
      expect(CEREBRAS).toBeDefined();
      expect(typeof CEREBRAS.apiKey).toBe("string");
      expect(typeof CEREBRAS.baseUrl).toBe("string");
      expect(typeof CEREBRAS.model).toBe("string");
    });

    it("COST exports are defined", () => {
      expect(COST).toBeDefined();
      expect(typeof COST.cerebrasPerReq).toBe("number");
      expect(typeof COST.nebiusPerReq).toBe("number");
    });
  });
});