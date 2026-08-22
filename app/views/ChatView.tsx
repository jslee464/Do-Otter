"use client";
/* =====================================================================
 *  수달이 챗봇 뷰  — 담당: 수달이 AI
 *  (API: /api/chat, 홈 터치 멘트: /api/otter-line, 프롬프트: lib/llm.ts)
 * ===================================================================== */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IMG } from "../shared";
import type { ChatRow } from "../../lib/backend";

export default function ChatView({
  username,
  msgs,
  busy,
  onSend,
  onClose,
}: {
  username: string;
  msgs: ChatRow[];
  busy: boolean;
  onSend: (t: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);
  const quicks = ["오늘 뭐부터 할까?", "집중이 안 돼 😵", "동기부여 해줘", "내 공부 어때?"];
  function send() {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    onSend(t);
  }
  return (
    <div className="chat-screen">
      <div className="chat-header">
        <button className="chat-back" onClick={onClose} aria-label="뒤로">
          ‹
        </button>
        <Image className="chat-ava" src={`${IMG}/character_flat.png`} alt="Otti" width={72} height={72} />
        <div>
          <div className="chat-name">Otti</div>
          <div className="chat-status">● 항상 네 곁에 있어</div>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {msgs.length === 0 && (
          <div className="chat-empty">
            <Image className="chat-empty-character" src={`${IMG}/character_fish.jpg`} alt="Otti" width={512} height={512} />
            <div className="ce-t">안녕 {username}! 🦦</div>
            <div className="ce-d">공부 고민, 계획, 뭐든 편하게 얘기해봐.</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="chat-bubble assistant typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="chat-quicks">
        {quicks.map((q) => (
          <button key={q} onClick={() => !busy && onSend(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Otti에게 말 걸기…"
        />
        <button className="chat-send" onClick={send} disabled={busy || !text.trim()}>
          ↑
        </button>
      </div>
    </div>
  );
}
