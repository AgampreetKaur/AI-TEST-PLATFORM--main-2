// chatbot-app.js
// AI Tutor module — wired to the "simple-chatbot-backend" (direct Gemini,
// no chapters/RAG). Every question is sent straight to Gemini along with
// recent chat history for follow-ups.

const { useState, useEffect, useRef } = React;

// ---------------------------------------------------------------------
// CONFIG — the only thing you'll touch when the backend URL changes
// ---------------------------------------------------------------------

// Leave BACKEND_CONNECTED = false to keep using dummy answers.
const BACKEND_CONNECTED = true;
// Replace with your deployed simple-chatbot-backend URL, e.g.
// "https://simple-chatbot-backend.onrender.com/chat"
const CHAT_ENDPOINT = "https://chapter-doubt-chatbot.onrender.com/chat";

// ---------------------------------------------------------------------
// Small local fallbacks (only used if the shared components aren't found)
// ---------------------------------------------------------------------

function FallbackLayout({ title, subtitle, children }) {
    return (
        <div className="min-h-screen bg-[var(--bg-body)]">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">{title}</h1>
                    {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

function showToast(message, type) {
    if (window.Toast && typeof window.Toast.show === "function") {
        window.Toast.show(message, type);
        return;
    }
    // very light fallback so nothing breaks if Toast isn't loaded
    console.log(`[${type || "info"}] ${message}`);
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function getDummyAnswer(question) {
    if (!question || !question.trim()) {
        return "Please type a question first.";
    }
    return (
        `Backend not connected yet.\n\n` +
        `Once the AI Tutor backend is live, I'll answer this question using Gemini. ` +
        `For now this is a placeholder response so you can test the chat UI end to end.`
    );
}

// Backend's ChatRequest expects chat_history entries shaped like
// { role: "user" | "assistant", content: string } — our UI stores
// messages as { role: "user" | "bot", text }, so we convert here.
function toBackendHistory(messages) {
    return messages
        .filter((m) => !m.isTyping)
        .slice(-6) // keep the payload small; last few turns is plenty for follow-ups
        .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
        }));
}

async function askBackend(question, priorMessages) {
    const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            question: question,
            chat_history: toBackendHistory(priorMessages),
        }),
    });

    if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
    }

    // Matches ChatResponse: { answer }
    const data = await response.json();
    return {
        answer: data.answer || "No answer returned by the backend.",
    };
}

// ---------------------------------------------------------------------
// Chat message bubble
// ---------------------------------------------------------------------

function ChatBubble({ role, text, isTyping }) {
    const isUser = role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center mr-2 shrink-0">
                    <i className="lucide-bot text-sm"></i>
                </div>
            )}
            <div
                className={
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed " +
                    (isUser
                        ? "bg-[var(--primary)] text-white rounded-br-sm"
                        : "bg-gray-100 text-[var(--text-main)] rounded-bl-sm")
                }
            >
                {isTyping ? (
                    <span className="inline-flex gap-1 items-center py-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    </span>
                ) : (
                    text
                )}
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center ml-2 shrink-0">
                    <i className="lucide-user text-sm"></i>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------

function ChatbotApp() {
    const [messages, setMessages] = useState([
        {
            role: "bot",
            text: "Hi! I'm your AI Tutor. Ask me anything and I'll do my best to help.",
        },
    ]);
    const [question, setQuestion] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isSending]);

    async function handleSend() {
        const trimmed = question.trim();
        if (!trimmed) return;

        setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
        setQuestion("");
        setIsSending(true);

        try {
            let answer;
            if (BACKEND_CONNECTED) {
                const result = await askBackend(trimmed, messages);
                answer = result.answer;
            } else {
                // simulate a short delay so the typing indicator is visible
                await new Promise((res) => setTimeout(res, 600));
                answer = getDummyAnswer(trimmed);
            }
            setMessages((prev) => [...prev, { role: "bot", text: answer }]);
        } catch (err) {
            console.error(err);
            const errorText = "Something went wrong reaching the AI Tutor. Please try again.";
            setMessages((prev) => [...prev, { role: "bot", text: errorText }]);
            showToast("Could not get a response from the AI Tutor", "error");
        } finally {
            setIsSending(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleClearChat() {
        setMessages([
            { role: "bot", text: "Chat cleared. Ask me anything." },
        ]);
    }

    const Layout = window.DashboardLayout || FallbackLayout;

    return (
        <Layout title="AI Tutor" subtitle="Ask any question and get an instant answer">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left panel */}
                <div className="lg:col-span-1">
                    <div className="card p-5">
                        <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <i className="lucide-message-circle"></i>
                            AI Tutor
                        </h3>

                        <p className="text-xs text-gray-400 mb-4">
                            This assistant answers using Gemini's general knowledge — it isn't
                            restricted to any specific chapter material.
                        </p>

                        <button className="btn-secondary w-full justify-center" onClick={handleClearChat}>
                            <i className="lucide-trash-2"></i>
                            Clear Chat
                        </button>

                        {!BACKEND_CONNECTED && (
                            <div className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                                Backend not connected — showing placeholder answers.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right panel — Chat */}
                <div className="lg:col-span-3">
                    <div className="card flex flex-col h-[70vh]">
                        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                                <i className="lucide-bot text-sm"></i>
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-[var(--text-main)]">AI Tutor</p>
                                <p className="text-xs text-gray-400">General doubt-solving</p>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
                            {messages.map((m, i) => (
                                <ChatBubble key={i} role={m.role} text={m.text} />
                            ))}
                            {isSending && <ChatBubble role="bot" isTyping={true} />}
                        </div>

                        <div className="border-t border-[var(--border-color)] p-4">
                            <div className="flex items-end gap-2">
                                <textarea
                                    className="input-field resize-none"
                                    rows={1}
                                    placeholder="Type your question..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isSending}
                                />
                                <button
                                    className="btn-primary shrink-0"
                                    onClick={handleSend}
                                    disabled={isSending || !question.trim()}
                                >
                                    <i className="lucide-send"></i>
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// ---------------------------------------------------------------------
// Mount (with a minimal error boundary so a render error doesn't blank the page)
// ---------------------------------------------------------------------

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("ChatbotApp crashed:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center text-red-600">
                    Something went wrong loading the AI Tutor. Check the console for details.
                </div>
            );
        }
        return this.props.children;
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <ErrorBoundary>
        <ChatbotApp />
    </ErrorBoundary>
);