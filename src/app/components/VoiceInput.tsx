import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Send,
  Square,
  Ear,
  EarOff,
  MessageSquareText,
  MessageSquareOff,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AlwaysListeningIndicator } from "./AlwaysListeningIndicator";
import type { AlwaysListeningState } from "./useAlwaysListening";
import {
  hasNativeSpeechRecognition,
  hasGetUserMedia,
  hasMediaRecorder,
  createRecorder,
  transcribeAudio,
} from "../../lib/stt";

interface VoiceInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  alwaysListeningState?: AlwaysListeningState;
  onToggleAlwaysListening?: () => void;
  onManualTrigger?: (text: string) => void;
  onToggleTranscription?: () => void;
}

// Web Speech API types
interface SpeechRecognitionEvent {
  results: {
    readonly length: number;
    [index: number]: {
      readonly isFinal: boolean;
      readonly length: number;
      [index: number]: {
        readonly transcript: string;
        readonly confidence: number;
      };
    };
  };
  resultIndex: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function VoiceInput({
  onSubmit,
  isProcessing,
  alwaysListeningState,
  onToggleAlwaysListening,
  onManualTrigger,
  onToggleTranscription,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false); // Whisper processing
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [sttProvider, setSttProvider] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<ReturnType<typeof createRecorder> | null>(null);

  const isAlwaysOn = alwaysListeningState?.enabled ?? false;
  const showingTranscription =
    alwaysListeningState?.showTranscription ?? true;
  const pipelineActive =
    alwaysListeningState &&
    !["idle", "error"].includes(alwaysListeningState.stage);

  const submitResult = useCallback(
    (text: string) => {
      if (onManualTrigger) {
        onManualTrigger(text);
      } else {
        onSubmit(text);
      }
    },
    [onManualTrigger, onSubmit]
  );

  // ═══════════════════════════════════════════════════════════════════
  //  Start listening — Native SpeechRecognition or Whisper fallback
  // ═══════════════════════════════════════════════════════════════════

  const startListening = useCallback(() => {
    if (isAlwaysOn) return;
    setMicError(null);
    setSttProvider("");

    // ── Try native SpeechRecognition first ──
    const SpeechRecognitionClass = getSpeechRecognition();
    if (SpeechRecognitionClass) {
      setSttProvider("browser");
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalText = "";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (interim) setPartialTranscript(interim);
        if (final) {
          finalText = final.trim();
          setTranscript(finalText);
          setPartialTranscript("");
        }
      };

      recognition.onerror = (event: { error: string }) => {
        console.warn("[VoiceInput] SpeechRecognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setMicError(
            "Microphone access denied. Please allow mic permission in your browser settings."
          );
        } else if (event.error === "no-speech") {
          setMicError("No speech detected. Please try again.");
        } else {
          setMicError(
            `Voice input error: ${event.error}. Try typing instead.`
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (finalText) {
          submitResult(finalText);
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
        setTranscript("");
        setPartialTranscript("");
      } catch {
        setMicError("Could not start voice recognition. Please try again.");
      }
      return;
    }

    // ── Fallback: Whisper via MediaRecorder ──
    if (!hasGetUserMedia() || !hasMediaRecorder()) {
      setMicError(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your query below."
      );
      return;
    }

    setSttProvider("whisper");

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        micStreamRef.current = stream;
        const recorder = createRecorder(stream);
        recorderRef.current = recorder;
        recorder.start();
        setIsListening(true);
        setTranscript("");
        setPartialTranscript("Recording... tap stop when done");
      })
      .catch((err) => {
        console.warn("[VoiceInput] Mic access failed:", err);
        setMicError(
          "Microphone access denied. Please allow mic permission in your browser settings."
        );
      });
  }, [isAlwaysOn, submitResult]);

  // ═══════════════════════════════════════════════════════════════════
  //  Stop listening
  // ═══════════════════════════════════════════════════════════════════

  const stopListening = useCallback(async () => {
    // ── Native mode ──
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      // onend handler will submit
      return;
    }

    // ── Whisper mode ──
    if (recorderRef.current && recorderRef.current.isRecording()) {
      setIsListening(false);
      setIsTranscribing(true);
      setPartialTranscript("");

      try {
        const audioBlob = await recorderRef.current.stop();
        recorderRef.current = null;

        // Cleanup mic stream
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }

        if (audioBlob.size < 1024) {
          setMicError("Recording too short. Please try again.");
          setIsTranscribing(false);
          return;
        }

        const result = await transcribeAudio(audioBlob);
        console.info(
          `[VoiceInput] ${result.provider}: "${result.text}" (${result.durationMs}ms)`
        );

        if (result.text) {
          setTranscript(result.text);
          setSttProvider(result.provider);
          submitResult(result.text);
        } else {
          setMicError("Could not understand the audio. Please try again.");
        }
      } catch (err) {
        console.error("[VoiceInput] Whisper transcription failed:", err);
        setMicError(
          "Transcription failed. Please check your connection and try again."
        );
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    // Fallback — just reset
    setIsListening(false);
    const finalText = partialTranscript || transcript;
    if (finalText && finalText !== "Recording... tap stop when done") {
      submitResult(finalText);
    }
  }, [partialTranscript, transcript, submitResult]);

  const handleTextSubmit = () => {
    if (textInput.trim() && !isProcessing) {
      if (isAlwaysOn && onManualTrigger) {
        onManualTrigger(textInput.trim());
      } else {
        onSubmit(textInput.trim());
      }
      setTextInput("");
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="w-full space-y-2">
      {/* Always-listening pipeline indicator */}
      {alwaysListeningState && (
        <AlwaysListeningIndicator state={alwaysListeningState} />
      )}

      {/* Text input row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder={
              isAlwaysOn
                ? `Say "Friday" to activate — or type here...`
                : isListening
                ? "Listening..."
                : isTranscribing
                ? "Transcribing..."
                : "Ask anything or tap the mic..."
            }
            disabled={
              isListening || isProcessing || isTranscribing || pipelineActive
            }
            className="w-full px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 pr-10"
          />
          {textInput && !isListening && !isTranscribing && (
            <button
              onClick={handleTextSubmit}
              disabled={isProcessing}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <Send className="h-4 w-4 text-primary" />
            </button>
          )}
        </div>

        {/* Transcription toggle */}
        {isAlwaysOn && onToggleTranscription && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTranscription}
            className={`relative p-2.5 rounded-full transition-all shrink-0 ${
              showingTranscription
                ? "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            title={
              showingTranscription
                ? "Hide live transcription"
                : "Show live transcription"
            }
          >
            {showingTranscription ? (
              <MessageSquareText className="h-4 w-4" />
            ) : (
              <MessageSquareOff className="h-4 w-4" />
            )}
          </motion.button>
        )}

        {/* Always-listening toggle */}
        {onToggleAlwaysListening && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleAlwaysListening}
            className={`relative p-3 rounded-full transition-all shrink-0 ${
              isAlwaysOn
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            title={
              isAlwaysOn
                ? "Disable always listening"
                : "Enable always listening"
            }
          >
            {isAlwaysOn ? (
              <Ear className="h-4 w-4" />
            ) : (
              <EarOff className="h-4 w-4" />
            )}
            {isAlwaysOn && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-emerald-400"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}
          </motion.button>
        )}

        {/* Manual mic button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={
            isListening
              ? stopListening
              : isTranscribing
              ? undefined
              : startListening
          }
          disabled={isProcessing || isAlwaysOn || isTranscribing}
          className={`relative p-3.5 rounded-full transition-all shrink-0 ${
            isTranscribing
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
              : isListening
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : isAlwaysOn
              ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
              : "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
          } disabled:opacity-50`}
          title={
            isTranscribing
              ? "Transcribing with Whisper..."
              : isAlwaysOn
              ? "Always-listening active"
              : "Push to talk"
          }
        >
          {isTranscribing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isListening ? (
            <Square className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.button>
      </div>

      {/* Manual transcript display */}
      <AnimatePresence>
        {!isAlwaysOn &&
          (isListening || isTranscribing || partialTranscript || transcript) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 px-4 py-2.5 rounded-lg bg-muted/50">
                {isListening && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-red-500 rounded-full"
                          animate={{ height: [4, 16, 4] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-red-500"
                      style={{ fontSize: "0.75rem", fontWeight: 500 }}
                    >
                      Listening...
                    </span>
                    {sttProvider && (
                      <span
                        className="text-muted-foreground ml-auto"
                        style={{ fontSize: "0.625rem" }}
                      >
                        {sttProvider === "browser"
                          ? "Web Speech API"
                          : "Whisper"}
                      </span>
                    )}
                  </div>
                )}
                {isTranscribing && (
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2
                      className="h-3.5 w-3.5 text-purple-500 animate-spin"
                    />
                    <span
                      className="text-purple-500"
                      style={{ fontSize: "0.75rem", fontWeight: 500 }}
                    >
                      Transcribing with Whisper...
                    </span>
                  </div>
                )}
                <p
                  className={
                    isListening || isTranscribing
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }
                >
                  {partialTranscript || transcript}
                  {isListening && partialTranscript && (
                    <motion.span
                      animate={{ opacity: [0, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="inline-block w-0.5 h-4 bg-current ml-0.5 align-text-bottom"
                    />
                  )}
                </p>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Mic error */}
      {micError && (
        <div
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600"
          style={{ fontSize: "0.875rem" }}
        >
          <MicOff className="h-4 w-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}
    </div>
  );
}
