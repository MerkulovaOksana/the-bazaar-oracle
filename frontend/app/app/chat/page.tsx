"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  inputType?: "text" | "voice";
}

export default function ChatPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth");
  }, [isAuthenticated, router]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const data = await api.sendMessage(userMsg.content, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ошибка: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });

        setMessages((prev) => [
          ...prev,
          { role: "user", content: "[Голосовое сообщение...]", inputType: "voice" },
        ]);
        setLoading(true);

        try {
          const data = await api.sendVoice(blob);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "user",
              content: "[🎤 Голос] " + (data.reply ? "Распознано" : ""),
              inputType: "voice",
            };
            return [...updated, { role: "assistant", content: data.reply }];
          });
        } catch (err: any) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Ошибка: " + err.message },
          ]);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Доступ к микрофону запрещён");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 flex flex-col">
      <h1 className="text-3xl font-bold mb-4 text-bazaar-warm">RAG-Ассистент</h1>
      <p className="text-sm text-bazaar-muted mb-6">
        Спроси о механиках The Bazaar, предметах, монстрах или стратегиях.
      </p>

      <div className="flex-1 bg-card-gradient rounded-xl border border-bazaar-accent/15 p-4 mb-4 overflow-y-auto max-h-[60vh] space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-bazaar-muted py-12">
            <div className="text-4xl mb-3">🤖</div>
            <p>Задай вопрос о механиках игры!</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                "Как работает multicast?",
                "Что контрит poison-билды?",
                "Лучшие предметы против Дракончика?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="text-xs bg-bazaar-bg border border-bazaar-accent/20 rounded-lg px-3 py-1.5 hover:border-bazaar-accent/40 transition text-bazaar-warm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-bazaar-accent/20 text-bazaar-warm"
                  : "bg-bazaar-bg text-bazaar-text"
              }`}
            >
              {m.inputType === "voice" && (
                <span className="text-bazaar-gold text-xs">🎤 </span>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-bazaar-bg rounded-xl px-4 py-2.5 text-sm text-bazaar-muted animate-pulse">
              Думаю...
            </div>
          </div>
        )}
        <div ref={chatEnd} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`px-4 rounded-xl border transition ${
            recording
              ? "bg-bazaar-red/20 border-bazaar-red text-bazaar-red animate-pulse"
              : "bg-bazaar-card border-bazaar-accent/20 text-bazaar-muted hover:text-bazaar-warm"
          }`}
          title={recording ? "Остановить" : "Записать голос"}
        >
          🎤
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder="Спроси о механиках, предметах, стратегиях..."
          className="flex-1 bg-bazaar-card border border-bazaar-accent/20 rounded-xl px-4 py-2.5 text-bazaar-text focus:outline-none focus:border-bazaar-accent transition"
          disabled={loading}
        />
        <button
          onClick={sendText}
          disabled={loading || !input.trim()}
          className="bg-gold-gradient hover:brightness-110 disabled:opacity-50 text-bazaar-bg font-semibold px-6 rounded-xl transition"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
