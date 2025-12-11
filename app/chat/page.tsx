"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  severity?: number;
  severityLabel?: "green" | "yellow" | "red" | "black";
  action?: string;
  doctorQuestion?: string;
};

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const seedMessages: Message[] = [
  {
    id: makeId(),
    role: "assistant",
    content:
      'Share the medicines you take to check interactions. Example: "I take the blue heart pill, water pill, and my arthritis medicine." I will reply with severity, explanation, one action, and a question for your doctor.',
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognitionReady, setRecognitionReady] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const recognitionRef = useRef<any>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const scroll = () => {
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    };
    scroll();
  }, [messages]);

  useEffect(() => {
    const load = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionResult = await sessionResponse.json();
        if (!sessionResponse.ok || !sessionResult.authenticated) {
          window.location.href = "/login";
          return;
        }
        const response = await fetch("/api/chat", { method: "GET", cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          setError(result.error ?? "Unable to load chat.");
          return;
        }
        setMessages(
          (result.data ?? []).map((m: any) => {
            const score = typeof m.severity === "number" ? m.severity : undefined;
            const label = m.severityLabel || severityLabel(score);
            return {
              ...m,
              severity: score,
              severityLabel: label,
              time: new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
          })
        );
        if (!result.data || result.data.length === 0) {
          setMessages(seedMessages);
        }
      } catch (err: any) {
        setError(err?.message ?? "Unable to load chat.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((res: any) => res[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        setInput(transcript);
      }
    };
    recognitionRef.current = recognition;
    setRecognitionReady(true);
  }, []);

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const placeholder = useMemo(
    () =>
      listening ? "Listening..." : "Ask a medical question or describe symptoms",
    [listening]
  );

  const badge = (label?: Message["severityLabel"]) => {
    switch (label) {
      case "green":
        return "bg-emerald-100 text-emerald-800 ring-emerald-200";
      case "yellow":
        return "bg-amber-100 text-amber-800 ring-amber-200";
      case "red":
        return "bg-rose-100 text-rose-800 ring-rose-200";
      case "black":
        return "bg-slate-900 text-white ring-slate-700";
      default:
        return "bg-slate-100 text-slate-700 ring-slate-200";
    }
  };

  const severityText = (label?: Message["severityLabel"]) => {
    switch (label) {
      case "green":
        return "This combination is safe to continue";
      case "yellow":
        return "Monitor for dizziness; mention at next checkup";
      case "red":
        return "Contact doctor within 24 hours";
      case "black":
        return "Stop taking and call doctor now";
      default:
        return null;
    }
  };

  const severityLabel = (score?: number): Message["severityLabel"] => {
    if (score === undefined) return undefined;
    if (score <= 3) return "green";
    if (score <= 6) return "yellow";
    if (score <= 8) return "red";
    return "black";
  };

  const handleVoice = () => {
    if (!recognitionReady || !recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 200)}px`;
  };

  const resetInputHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = "44px";
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    stopListening();
    const text = input.trim();
    const userMessage: Message = {
      id: makeId(),
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    resetInputHeight();
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        const fallback: Message = {
          id: makeId(),
          role: "assistant",
          content:
            result.error ??
            "Unable to process right now. Try again in a moment.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, fallback]);
        if (response.status === 401) {
          setTimeout(() => {
            window.location.href = "/login";
          }, 400);
        }
        return;
      }
      const score =
        typeof result.data.severityScore === "number"
          ? result.data.severityScore
          : undefined;
      const label = severityLabel(score);
      const assistant: Message = {
        id: makeId(),
        role: "assistant",
        content: result.data.explanation,
        action: result.data.recommendedAction,
        doctorQuestion: result.data.doctorQuestion,
        severity: score,
        severityLabel: label,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistant]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-white via-slate-50 to-sky-50 text-slate-900">
      <div className="flex h-full min-h-0 flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-col gap-3 rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-semibold text-sky-700">MediCare Assistant</p>
            <p className="hidden text-sm text-slate-600 sm:block">
              Ask about medicines, timing, side effects, and what to raise with your doctor.
            </p>
          </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:px-4 sm:py-2 sm:text-sm"
              >
                Clear Chat
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:px-4 sm:py-2 sm:text-sm"
              >
                Logout
              </button>
            </div>
        </header>
        <div className="grid flex-1 min-h-0 grid-rows-[1fr_auto] gap-4 overflow-hidden rounded-3xl bg-white p-4 shadow-xl ring-1 ring-black/5 sm:p-6">
          <div
            ref={feedRef}
            className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto pr-1 scrollbar-hidden"
          >
            {loading ? (
              <div className="text-sm text-slate-500">Loading chat...</div>
            ) : null}
            {error ? (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex w-full ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === "assistant"
                      ? "bg-white text-slate-900 border-slate-200"
                      : "bg-slate-900 text-white border-slate-800"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    {message.role === "assistant" ? (
                      <span className="text-slate-700">Assistant</span>
                    ) : null}
                    {message.severityLabel && message.severity !== undefined ? (
                      <>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ring-1 ${badge(message.severityLabel)}`}>
                          {severityText(message.severityLabel)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ring-1 ${
                            message.role === "assistant"
                              ? "bg-slate-50 text-slate-800 ring-slate-200"
                              : "bg-slate-800 text-white ring-slate-700"
                          }`}
                        >
                          Severity {message.severity}/10
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.action ? (
                    <div className="mt-3 text-[13px]">
                      <p className="font-semibold">Recommended action</p>
                      <p className={message.role === "assistant" ? "text-slate-800" : "text-slate-100"}>
                        {message.action}
                      </p>
                    </div>
                  ) : null}
                  {message.doctorQuestion ? (
                    <div className="mt-3 text-[13px]">
                      <p className="font-semibold">Question for doctor</p>
                      <p className={message.role === "assistant" ? "text-slate-800" : "text-slate-100"}>
                        {message.doctorQuestion}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex w-full justify-start">
                <div className="flex max-w-[90%] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-600" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-600 delay-150" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-600 delay-300" />
                  <span className="text-slate-700">Assistant is preparing a response...</span>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 sm:p-4 ring-1 ring-black/5">
            <div className="flex items-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleVoice}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold transition sm:h-11 sm:w-12 ${
                  listening
                    ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                } ${recognitionReady ? "" : "opacity-60"}`}
                disabled={!recognitionReady}
              >
                {listening ? "●" : "🎤"}
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  stopListening();
                  setInput(e.target.value);
                  resizeInput();
                }}
                disabled={listening}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                onInput={resizeInput}
                placeholder={placeholder}
                className={`min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:min-h-[3rem] ${
                  listening ? "cursor-not-allowed opacity-70" : ""
                }`}
              />
              <button
                type="button"
                onClick={sendMessage}
                className="flex h-10 w-16 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-xs font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70 sm:h-11 sm:w-24 sm:text-sm"
                disabled={!input.trim() || sending}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showClearConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5">
            <h3 className="text-lg font-semibold text-slate-900">Clear chat history?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will remove all your messages and reset the conversation.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/chat", { method: "DELETE" });
                    const result = await response.json();
                    if (response.ok && result.success) {
                      setMessages(seedMessages);
                      setShowClearConfirm(false);
                    }
                  } catch (err) {
                    console.error("Failed to clear chat", err);
                  }
                }}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

