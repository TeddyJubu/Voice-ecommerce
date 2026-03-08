import { useState, useEffect } from "react";
import { Volume2, Shield, CreditCard, Trash2, Check, Ear, Zap, BrainCircuit, MessageSquareText, Radio } from "lucide-react";
import { hasNativeSpeechRecognition, hasGetUserMedia, hasMediaRecorder } from "../../lib/stt";

export default function SettingsPage() {
  const [selectedVoice, setSelectedVoice] = useState(() =>
    localStorage.getItem("voice-selectedVoice") || "21m00Tcm4TlvDq8ikWAM"
  );
  const [autoSpeak, setAutoSpeak] = useState(() =>
    localStorage.getItem("voice-autoSpeak") !== "false"
  );
  const [alwaysListening, setAlwaysListening] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const [preferredLLM, setPreferredLLM] = useState<"cerebras" | "nebius">(() =>
    (localStorage.getItem("voice-preferredLLM") as "cerebras" | "nebius") || "cerebras"
  );

  useEffect(() => {
    localStorage.setItem("voice-selectedVoice", selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem("voice-autoSpeak", String(autoSpeak));
  }, [autoSpeak]);

  useEffect(() => {
    localStorage.setItem("voice-preferredLLM", preferredLLM);
  }, [preferredLLM]);
  const [plan] = useState<"free" | "pro">("free");
  const [cleared, setCleared] = useState(false);

  // ElevenLabs pre-made voice IDs — https://elevenlabs.io/docs/voices/premade-voices
  const voices = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Neutral, balanced" },
    { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",   description: "Warm, conversational" },
    { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", description: "Expressive, storytelling" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",   description: "Bright, energetic" },
    { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli",    description: "Calm, soothing" },
  ];

  const clearHistory = () => {
    localStorage.removeItem("voice-assistant-history");
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="mb-6">Settings</h1>

        {/* Voice Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <h2>Voice</h2>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
            <div>
              <label className="text-muted-foreground mb-2 block" style={{ fontSize: '0.875rem' }}>
                Choose voice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {voices.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedVoice === v.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        selectedVoice === v.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                      style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      {v.name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem' }}>{v.name}</p>
                      <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                        {v.description}
                      </p>
                    </div>
                    {selectedVoice === v.id && (
                      <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p style={{ fontSize: '0.875rem' }}>Auto-speak answers</p>
                <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                  Automatically read the summary aloud
                </p>
              </div>
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoSpeak ? "bg-primary" : "bg-switch-background"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    autoSpeak ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Always Listening Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Ear className="h-5 w-5 text-muted-foreground" />
            <h2>Always Listening</h2>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: "0.875rem" }}>Enable always-listening mode</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                  Say "Friday" to activate — ignores all other speech
                </p>
              </div>
              <button
                onClick={() => setAlwaysListening(!alwaysListening)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  alwaysListening ? "bg-emerald-500" : "bg-switch-background"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    alwaysListening ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Wake word info */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <span className="text-violet-500" style={{ fontSize: "0.75rem", fontWeight: 700 }}>F</span>
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "0.8125rem", fontWeight: 500 }}>Wake word: "Friday"</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>
                  Only responds when you say "Friday" — all other speech is ignored and costs nothing
                </p>
              </div>
            </div>

            {/* Live transcription toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p style={{ fontSize: "0.875rem" }}>Show live transcription</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    Display what Friday hears in real-time
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  showTranscription ? "bg-violet-500" : "bg-switch-background"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    showTranscription ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground mb-3" style={{ fontSize: "0.75rem" }}>
                Cost-saving pipeline tiers:
              </p>
              <div className="space-y-2">
                {[
                  { tier: 0, name: "VAD", desc: "Voice Activity Detection runs in-browser", cost: "Free", color: "bg-emerald-500" },
                  { tier: 1, name: "Intent Gate", desc: "Lightweight classifier filters ambient speech", cost: "$0.0002/check", color: "bg-amber-500" },
                  { tier: 2, name: "STT", desc: "Speech-to-text only for directed speech", cost: "$0.006/sec", color: "bg-purple-500" },
                  { tier: 3, name: "LLM", desc: "Cerebras primary, Nebius fallback", cost: "$0.003/req", color: "bg-blue-500" },
                ].map((t) => (
                  <div key={t.tier} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20">
                    <div className={`w-6 h-6 rounded-md ${t.color} text-white flex items-center justify-center shrink-0`} style={{ fontSize: "0.625rem", fontWeight: 700 }}>
                      T{t.tier}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{t.name}</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>{t.desc}</p>
                    </div>
                    <span className="text-emerald-600 shrink-0" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>{t.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* LLM Routing Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="h-5 w-5 text-muted-foreground" />
            <h2>LLM Routing</h2>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              Smart routing: live-data queries (news, weather, prices) route to Pollinations search first. Knowledge queries route to Cerebras first.
            </p>
            {[
              {
                id: "cerebras" as const,
                name: "Cerebras GPT-OSS 120B",
                desc: "~2,100 tok/s · Ultra-low latency · $0.003/req",
                badge: "PRIMARY",
                badgeColor: "bg-emerald-500/10 text-emerald-600",
              },
              {
                id: "nebius" as const,
                name: "Nebius Token Factory",
                desc: "~1,800 tok/s · Wafer-scale fallback · $0.004/req",
                badge: "FALLBACK",
                badgeColor: "bg-sky-500/10 text-sky-600",
              },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setPreferredLLM(m.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  preferredLLM === m.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/30"
                }`}
              >
                <Zap className={`h-4 w-4 shrink-0 ${preferredLLM === m.id ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p style={{ fontSize: "0.875rem" }}>{m.name}</p>
                    <span className={`px-1.5 py-0.5 rounded ${m.badgeColor}`} style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.05em" }}>
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{m.desc}</p>
                </div>
                {preferredLLM === m.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}

            {/* STT Provider info */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <p style={{ fontSize: "0.875rem" }}>Speech-to-Text</p>
              </div>
              <div className="space-y-2">
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${hasNativeSpeechRecognition() ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-muted/20"}`}>
                  <div className={`w-2 h-2 rounded-full ${hasNativeSpeechRecognition() ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1">
                    <p style={{ fontSize: "0.8125rem", fontWeight: 500 }}>Web Speech API</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>
                      {hasNativeSpeechRecognition() ? "Available — used as primary STT (free, in-browser)" : "Not available in this browser"}
                    </p>
                  </div>
                  <span className="text-emerald-600 shrink-0" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Free</span>
                </div>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${!hasNativeSpeechRecognition() && hasGetUserMedia() ? "bg-purple-500/5 border border-purple-500/10" : "bg-muted/20"}`}>
                  <div className={`w-2 h-2 rounded-full ${hasGetUserMedia() && hasMediaRecorder() ? "bg-purple-500" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1">
                    <p style={{ fontSize: "0.8125rem", fontWeight: 500 }}>Groq/Cerebras Whisper</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>
                      {hasGetUserMedia() && hasMediaRecorder()
                        ? hasNativeSpeechRecognition()
                          ? "Available as fallback — used when native STT unavailable"
                          : "Active — recording + VAD locally, Whisper transcription via API"
                        : "Requires microphone access (getUserMedia)"}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>$0.006/s</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2>Privacy</h2>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '0.875rem' }}>Delete all history</p>
                <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                  Remove all past queries and saved results
                </p>
              </div>
              <button
                onClick={clearHistory}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  cleared
                    ? "bg-green-50 text-green-600"
                    : "text-destructive hover:bg-red-50"
                }`}
                style={{ fontSize: '0.875rem' }}
              >
                {cleared ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Cleared
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </>
                )}
              </button>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                Audio is never stored. Only text transcripts are saved locally
                in your browser.
              </p>
            </div>
          </div>
        </section>

        {/* Plan Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2>Plan</h2>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div
              className={`p-4 flex items-center justify-between ${
                plan === "free" ? "bg-muted/30" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p style={{ fontWeight: 500 }}>Free Plan</p>
                  {plan === "free" && (
                    <span
                      className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full"
                      style={{ fontSize: '0.625rem', fontWeight: 600 }}
                    >
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.75rem' }}>
                  20 queries/day · Basic voices
                </p>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 300 }}>$0</span>
            </div>
            <div className="border-t border-border p-4 flex items-center justify-between">
              <div>
                <p style={{ fontWeight: 500 }}>Pro Plan</p>
                <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.75rem' }}>
                  Unlimited queries · Premium voices · Priority processing
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '1.25rem', fontWeight: 300 }}>$9/mo</span>
                <button
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  style={{ fontSize: '0.875rem' }}
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}