"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCcw, SendHorizontal, Sparkles, Stethoscope, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

type ChatMessage = {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string | Date;
  category?: "general" | "symptom" | "wellness" | "emergency";
  confidence?: number;
  suggestedActions?: string[];
  relatedSymptoms?: string[];
};

type ChatSession = {
  id: string;
  startedAt: string | Date;
  isActive: boolean;
  urgencyLevel?: "low" | "medium" | "high" | "emergency";
};

type FetchState = "idle" | "loading" | "error";

const quickPrompts = [
  {
    label: "Fever guidance (English)",
    text: "I have had a fever for two days, what should I do?",
  },
  {
    label: "Diet tips (हिंदी)",
    text: "मधुमेह होने पर खान-पान कैसे रखें?",
  },
  {
    label: "Workout advice (ਪੰਜਾਬੀ)",
    text: "ਮੈਨੂੰ ਘੁੱਟਨੇ ਦੇ ਦਰਦ ਲਈ ਕਿਹੜੀ ਕਸਰਤਾਂ ਕਰਨੀ ਚਾਹੀਦੀਆਂ ਹਨ?",
  },
  {
    label: "Chest pain emergency",
    text: "I have sudden chest pain and shortness of breath. What should I do immediately?",
  },
];

const categoryStyles: Record<NonNullable<ChatMessage["category"]>, string> = {
  general: "bg-slate-100 text-slate-700",
  symptom: "bg-amber-100 text-amber-700",
  wellness: "bg-emerald-100 text-emerald-700",
  emergency: "bg-red-100 text-red-700",
};

const markdownComponents: Components = {
  p: ({ children }) => <p className="mt-2 leading-relaxed text-foreground/80 first:mt-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/80">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5 text-foreground/80">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground/90">{children}</code>
    ) : (
      <pre className="mt-3 max-h-72 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
        <code>{children}</code>
      </pre>
    ),
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-4 border-primary/40 pl-3 text-sm italic text-foreground/80">{children}</blockquote>
  ),
  h1: ({ children }) => <h3 className="mt-4 text-lg font-semibold text-foreground">{children}</h3>,
  h2: ({ children }) => <h4 className="mt-3 text-base font-semibold text-foreground">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-3 text-sm font-semibold uppercase tracking-wide text-foreground/80">{children}</h5>,
};

const urgencyCopy: Record<NonNullable<ChatSession["urgencyLevel"]>, { icon: React.ReactNode; text: string; tone: string }> = {
  low: {
    icon: <Sparkles className="h-4 w-4" />,
    text: "Low",
    tone: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  medium: {
    icon: <Stethoscope className="h-4 w-4" />,
    text: "Moderate",
    tone: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  high: {
    icon: <AlertTriangle className="h-4 w-4" />,
    text: "High",
    tone: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  emergency: {
    icon: <AlertTriangle className="h-4 w-4" />,
    text: "Emergency",
    tone: "bg-red-50 text-red-700 border border-red-200 animate-pulse",
  },
};

function formatTimestamp(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatPage() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadState, setLoadState] = useState<FetchState>("idle");
  const [sendState, setSendState] = useState<FetchState>("idle");
  const [clearState, setClearState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  const hasMessages = messages.length > 0;

  const currentUrgency = useMemo(() => {
    return session?.urgencyLevel ?? "low";
  }, [session]);

  const scrollToBottom = useCallback(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const fetchSession = useCallback(async () => {
    setLoadState("loading");
    setError(null);
    try {
      const response = await fetch("/api/chat", { credentials: "include" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const backendMessage = payload?.error || payload?.message;
        if (response.status === 401) {
          throw new Error("You need to be signed in to chat. Please log in again.");
        }
        if (response.status >= 500) {
          throw new Error(backendMessage || "AI service is temporarily unavailable. Please try again in a moment.");
        }
        throw new Error(backendMessage || "Unable to connect to AI assistant. Please try again.");
      }

      const data = payload?.data;
      setSession(data?.session ?? null);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setLoadState("idle");
      setTimeout(scrollToBottom, 200);
    } catch (err: any) {
      console.error("Failed to load chat session", err);
      setError(err?.message || "Failed to load chat session");
      setLoadState("error");
    }
  }, [scrollToBottom]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !session?.id) return;

    setSendState("loading");
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId: session.id }),
      });

      const payload = await response.json().catch(() => null);
      const backendMessage = payload?.error || payload?.message;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session expired. Please log in again to continue chatting.");
        }
        if (response.status >= 500) {
          throw new Error(backendMessage || "AI assistant encountered an issue. Please retry shortly.");
        }
        throw new Error(backendMessage || "Unable to send message");
      }

      const { userMessage, aiMessage } = payload?.data ?? {};

      setMessages((prev) => {
        const next = [...prev];
        if (userMessage) next.push(userMessage);
        if (aiMessage) next.push(aiMessage);
        return next;
      });

      setInput("");
      setSendState("idle");
      setTimeout(scrollToBottom, 150);
    } catch (err: any) {
      console.error("Failed to send chat message", err);
      setError(err?.message || "Failed to send message");
      setSendState("error");
    }
  }, [input, session, scrollToBottom]);

  const handleClearChat = useCallback(async () => {
    if (!session?.id) return;
    const confirmed = window.confirm("Clear the entire conversation history? This action cannot be undone.");
    if (!confirmed) return;

    setClearState("loading");
    setError(null);

    try {
      const response = await fetch(`/api/chat?sessionId=${encodeURIComponent(session.id)}` , {
        method: "DELETE",
        credentials: "include",
      });

      const payload = await response.json().catch(() => null);
      const backendMessage = payload?.error || payload?.message;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session expired. Please log in again to clear the chat.");
        }
        throw new Error(backendMessage || "Unable to clear chat history. Please try again.");
      }

      const nextSession = (payload?.data?.session ?? null) as ChatSession | null;
      const nextMessages = Array.isArray(payload?.data?.messages) ? (payload.data.messages as ChatMessage[]) : [];
      setSession(nextSession);
      setMessages(nextMessages);
      setInput("");
    } catch (err: any) {
      console.error("Failed to clear chat session", err);
      setError(err?.message || "Failed to clear chat history");
    } finally {
      setClearState("idle");
    }
  }, [session]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">AI Health Assistant</h1>
        <p className="text-muted-foreground max-w-3xl">
          Ask health questions, receive wellness tips, and get triage guidance. Responses are generated using our Gemini-powered assistant. For urgent or emergency symptoms, always contact a medical professional immediately.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="flex h-[32rem] flex-col">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Conversation</CardTitle>
                <CardDescription>
                  Session started {session?.startedAt ? new Date(session.startedAt).toLocaleString() : "just now"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleClearChat()}
                  disabled={!session || clearState === "loading" || loadState === "loading"}
                  className="text-red-600 hover:text-red-600 hover:border-red-300"
                >
                  {clearState === "loading" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Clear chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchSession()}
                  disabled={loadState === "loading"}
                >
                  {loadState === "loading" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
                {session ? (
                  <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${urgencyCopy[currentUrgency].tone}`}>
                    {urgencyCopy[currentUrgency].icon}
                    <span>{urgencyCopy[currentUrgency].text} urgency</span>
                  </div>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            <div
              ref={chatBodyRef}
              className="h-full space-y-4 overflow-y-auto pr-2"
            >
              {!hasMessages && loadState !== "loading" ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <Sparkles className="mb-2 h-8 w-8 text-accent" />
                  <p>Start the conversation by asking a health question. You can type in English, हिंदी, or ਪੰਜਾਬੀ.</p>
                </div>
              ) : null}

              {messages.map((message) => {
                const isUser = message.type === "user";
                const category = message.category ?? "general";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[70%] ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {isUser ? "You" : "ArogyaMitra AI"}
                        </span>
                        <span className="text-[10px] opacity-70">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm leading-relaxed text-foreground/80">
                        {isUser ? (
                          <p className="whitespace-pre-line text-primary-foreground/90">{message.content}</p>
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>

                      {!isUser && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${categoryStyles[category]}`}>
                            {category === "symptom"
                              ? "Symptom guidance"
                              : category === "wellness"
                              ? "Wellness"
                              : category === "emergency"
                              ? "Emergency"
                              : "General advice"}
                          </span>
                          {message.confidence && (
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                              Confidence {Math.round(message.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      )}

                      {!isUser && message.suggestedActions?.length ? (
                        <div className="mt-3 space-y-1 text-xs text-foreground/80">
                          <p className="font-semibold uppercase tracking-wide text-[11px]">Suggested actions</p>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {message.suggestedActions.map((action) => (
                              <li key={action} className="rounded-md bg-background/70 px-3 py-2">
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {!isUser && message.relatedSymptoms?.length ? (
                        <div className="mt-3 text-xs text-muted-foreground">
                          <span className="font-semibold">Related symptoms:</span> {message.relatedSymptoms.join(", ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {loadState === "loading" && (
                <div className="flex justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting to the AI assistant…
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="border-t bg-muted/30">
            <form
              className="flex w-full flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendMessage();
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe your symptoms, ask for wellness tips, or request appointment guidance…"
                disabled={sendState === "loading"}
                className="sm:flex-1"
              />
              <Button type="submit" disabled={!input.trim() || sendState === "loading"} className="sm:w-auto">
                {sendState === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <SendHorizontal className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </form>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Prompts</CardTitle>
              <CardDescription>Tap to populate the chat input with a common question.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => setInput(prompt.text)}
                  className="rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-left text-sm shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="font-medium text-foreground">{prompt.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{prompt.text}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Guidance</CardTitle>
              <CardDescription>Recognize when to seek immediate help.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>
                  If you experience severe chest pain, difficulty breathing, heavy bleeding, or loss of consciousness, call emergency services (108 in India) immediately.
                </span>
              </p>
              <ul className="space-y-2">
                <li>• <strong>High fever</strong> lasting more than 3 days should be reviewed by a doctor.</li>
                <li>• <strong>Chronic conditions</strong> like diabetes require regular follow-ups.</li>
                <li>• <strong>Mental health concerns</strong> deserve a professional consultation—reach out to a counselor or helpline.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
