"use client";
/* =====================================================================
 *  수달이 챗봇 뷰  — 담당: 수달이 AI
 *  (API: /api/chat, 홈 터치 멘트: /api/otter-line, 프롬프트: lib/llm.ts)
 * ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { IMG } from "../shared";
import type { ChatRow } from "../../lib/backend";
import type { RagMetadata, RagSource } from "../../lib/rag/api-types";

const CHAT_FACE = `${IMG}/otter-chat-face.png`;

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
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
  function jumpToMessage(index: number) {
    setHistoryOpen(false);
    messageRefs.current[index]?.scrollIntoView({ block: "center", behavior: "smooth" });
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
        <button
          className="chat-history-button"
          onClick={() => setHistoryOpen(true)}
          aria-label="대화목록 보기"
        >
          ☰
        </button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {msgs.length === 0 && (
          <div className="chat-reference">
            <div className="sample-user">근골격계 시험이 이틀 남았는데<br />범위가 너무 많아.</div>
            <div className="sample-otti">
              <img src={CHAT_FACE} alt="" />
              <span>지금은 틀린 문제 중심으로<br />압축해봐요.</span>
            </div>
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
          <div
            key={`${m.at}-${i}`}
            ref={(node) => {
              messageRefs.current[i] = node;
            }}
            className={`chat-message ${m.role}`}
          >
            {m.role === "assistant" ? (
              <div className="chat-assistant-row">
                <img className="chat-otter-avatar" src={CHAT_FACE} alt="" />
                <div className="chat-assistant-copy">
                  <div className="chat-bubble assistant">{m.content}</div>
                  {m.rag && (
                    <div className="chat-rag-meta">
                      <RagLabel rag={m.rag} />
                      <SourceDisclosure
                        sources={m.rag.sources}
                        retrieval={m.rag.retrieval}
                      />
                      {m.rag.fallback && (
                        <div className="rag-fallback">검수된 기본 문구로 답했어요.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="chat-bubble user">{m.content}</div>
            )}
          </div>
        ))}
        {busy && (
          <div className="chat-message assistant">
            <div className="chat-assistant-row">
              <img className="chat-otter-avatar" src={CHAT_FACE} alt="" />
              <div className="chat-bubble assistant typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </div>

      {historyOpen && (
        <div className="chat-history-backdrop" onClick={() => setHistoryOpen(false)}>
          <aside
            className="chat-history-panel"
            aria-label="대화목록"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <b>대화목록</b>
                <span>{username}님의 최근 대화</span>
              </div>
              <button onClick={() => setHistoryOpen(false)} aria-label="대화목록 닫기">
                ✕
              </button>
            </header>
            <div className="chat-history-list">
              {msgs.length === 0 ? (
                <p>아직 저장된 대화가 없어요.</p>
              ) : (
                msgs.map((m, i) => (
                  <button key={`${m.at}-history-${i}`} onClick={() => jumpToMessage(i)}>
                    <span>{m.role === "user" ? "나" : "Otti"}</span>
                    <b>{m.content}</b>
                    <small>
                      {new Date(m.at).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

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

function RagLabel({ rag }: { rag: RagMetadata }) {
  if (rag.emergency) {
    return <span className="rag-label emergency">안전 고정 안내</span>;
  }
  if (rag.sources.length > 0) {
    return (
      <span className="rag-label grounded">
        근거 기반 코칭{rag.situationId ? ` · ${rag.situationId}` : ""}
      </span>
    );
  }
  return (
    <span className="rag-label general">
      {rag.channel === "event" ? "상황 기반 개입" : "일상 대화"}
      {rag.situationId ? ` · ${rag.situationId}` : ""}
    </span>
  );
}

function SourceDisclosure({
  sources,
  retrieval,
}: {
  sources: RagSource[];
  retrieval?: RagMetadata["retrieval"];
}) {
  if (sources.length === 0) return null;
  return (
    <details className="rag-sources">
      <summary>근거 출처 {sources.length}개 보기</summary>
      <div className="rag-source-list">
        {sources.map((source) => (
          <div className="rag-source" key={source.id}>
            <span className="rag-source-id">{source.id}</span>
            <div>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              ) : (
                <span>{source.title}</span>
              )}
              <small>
                {source.publisher} · {source.year}
              </small>
            </div>
          </div>
        ))}
      </div>
      {retrieval && (
        <div className="rag-retrieval">
          {retrieval.mode} · 후보 {retrieval.candidateCount}개
        </div>
      )}
    </details>
  );
}
