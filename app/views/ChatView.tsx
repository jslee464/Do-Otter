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
    if (msgs.length === 0 && !busy) return;
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
        <div>
          <div className="chat-name">Otti 공부 상담</div>
          <div className="chat-status">● 집중 계획을 함께 세워요</div>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {msgs.length === 0 && (
          <div className="chat-reference">
            <div className="sample-user">근골격계 시험이 이틀 남았는데<br />범위가 너무 많아.</div>
            <div className="sample-otti"><img src={`${IMG}/face_happy.png`} alt="" /><span>지금은 틀린 문제 중심으로<br />압축해봐요.</span></div>
            <div className="study-plan-card">
              <h3>📋 &nbsp; 8시간 압축 계획</h3>
              <div><span>🎯</span><b>틀린 문제만 집중 공략<small>핵심 개념 + 오답 노트</small></b></div>
              <div><span>◷</span><b>2시간 단위 블록 학습<small>집중 → 복습 → 정리</small></b></div>
              <div><span>☑</span><b>마지막 2시간은 실전 감각<small>기출 & 모의고사 풀이</small></b></div>
            </div>
            <img className="chat-peek" src={`${IMG}/otter_default1.png`} alt="Otti" />
            <button className="chat-timer-start" onClick={() => onSend("25분 타이머로 시작할게")}>25분 타이머로 시작</button>
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
