/* =====================================================================
 *  Do-Otter · 통합 RAG 검색 (검수 매핑 + 질의 재정렬)
 *  ─────────────────────────────────────────────────────────────────────
 *  1) 상황 ID → 사람이 검수한 근거 후보군으로 안전 필터링
 *  2) 자유 입력이 있으면 topic/tags/usage/claim의 키워드 관련도로 재정렬
 *
 *  벡터 검색 없이도 38건 코퍼스에서는 충분히 빠르고 설명 가능하다.
 *  무엇보다 건강 근거와 코칭 근거가 엉뚱하게 섞이는 일을 막는다.
 *
 *  코퍼스가 수백 건으로 늘어나면 이 파일의 retrieve()만 교체하면 된다.
 *  상위 레이어(prompt.ts / route)는 Evidence[] 형태만 알면 되도록 격리.
 * ===================================================================== */

import {
  EVIDENCE,
  evidenceByIds,
  type Evidence,
  type EvidenceId,
} from "./evidence";
import {
  SITUATIONS,
  situationById,
  type Situation,
  type SituationId,
} from "./situations";

export type RetrievalMode = "curated" | "curated+keyword";

export type RetrieveOptions = {
  /** 자유 입력. 있으면 검수 후보군 안에서 관련도 순으로 재정렬한다. */
  query?: string;
  /** 프롬프트에 넣을 최대 근거 수. 앱 이벤트는 기본적으로 전체 후보를 쓴다. */
  maxEvidence?: number;
};

export type Retrieved = {
  situation: Situation;
  evidence: Evidence[];
  retrieval: {
    mode: RetrievalMode;
    candidateCount: number;
  };
};

const QUERY_STOP_WORDS = new Set([
  "그냥",
  "정말",
  "너무",
  "지금",
  "오늘",
  "어떻게",
  "해야",
  "해요",
  "하고",
  "하는",
  "있어",
  "없어",
]);

function queryTokens(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLocaleLowerCase("ko-KR")
        .match(/[A-Za-z0-9가-힣]+/g)
        ?.filter((token) => token.length >= 2 && !QUERY_STOP_WORDS.has(token)) ?? []
    )
  );
}

function fuzzyIncludes(text: string, token: string): boolean {
  if (text.includes(token)) return true;
  // 한국어 조사/어미가 붙은 질의("시험이", "집중을")도 짧은 태그와 맞춘다.
  if (token.length >= 3) {
    return text
      .split(/[^A-Za-z0-9가-힣]+/)
      .some((term) => term.length >= 2 && token.includes(term));
  }
  return false;
}

function relevanceScore(evidence: Evidence, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const tags = (evidence.tags ?? []).map((tag) => tag.toLocaleLowerCase("ko-KR"));
  const topic = evidence.topic.toLocaleLowerCase("ko-KR");
  const usage = evidence.usage.toLocaleLowerCase("ko-KR");
  const claim = evidence.claim.toLocaleLowerCase("ko-KR");
  const title = evidence.sourceTitle.toLocaleLowerCase("en-US");

  return tokens.reduce((score, token) => {
    if (tags.some((tag) => fuzzyIncludes(tag, token) || fuzzyIncludes(token, tag))) {
      score += 5;
    }
    if (fuzzyIncludes(topic, token)) score += 3;
    if (fuzzyIncludes(usage, token)) score += 2;
    if (fuzzyIncludes(claim, token)) score += 1;
    if (fuzzyIncludes(title, token)) score += 1;
    return score;
  }, 0);
}

/** 상황 ID → 검수된 { 상황, 근거자료[] }. 질의가 있으면 후보 안에서만 재정렬한다. */
export function retrieve(
  id: SituationId,
  options: RetrieveOptions = {}
): Retrieved | null {
  const situation = situationById(id);
  if (!situation) return null;
  const candidates = evidenceByIds(situation.evidenceIds);
  const query = options.query?.trim() ?? "";
  const tokens = queryTokens(query);
  let evidence = candidates;

  if (tokens.length > 0 && candidates.length > 1) {
    evidence = candidates
      .map((item, index) => ({ item, index, score: relevanceScore(item, tokens) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map(({ item }) => item);
  }

  if (options.maxEvidence && options.maxEvidence > 0) {
    evidence = evidence.slice(0, options.maxEvidence);
  }

  return {
    situation,
    evidence,
    retrieval: {
      mode: tokens.length > 0 ? "curated+keyword" : "curated",
      candidateCount: candidates.length,
    },
  };
}

export type EvidenceSource = {
  id: EvidenceId;
  title: string;
  publisher: string;
  year: string;
  url?: string;
};

/** API가 근거 전문 대신 안전한 출처 메타데이터만 노출할 때 사용한다. */
export function evidenceSources(retrieved: Retrieved): EvidenceSource[] {
  return retrieved.evidence.map((evidence) => ({
    id: evidence.id,
    title: evidence.sourceTitle,
    publisher: evidence.publisher,
    year: evidence.year,
    ...(evidence.url ? { url: evidence.url } : {}),
  }));
}

/** 빌드/테스트에서 코퍼스와 상황 매핑의 참조 무결성을 검사한다. */
export function validateRagCorpus(): string[] {
  const issues: string[] = [];
  const evidenceIds = new Set(EVIDENCE.map((evidence) => evidence.id));
  const situationIds = new Set(SITUATIONS.map((situation) => situation.id));

  if (evidenceIds.size !== EVIDENCE.length) issues.push("중복된 근거 ID가 있습니다.");
  if (situationIds.size !== SITUATIONS.length) issues.push("중복된 상황 ID가 있습니다.");

  for (const situation of SITUATIONS) {
    for (const evidenceId of situation.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push(`${situation.id}가 존재하지 않는 ${evidenceId}를 참조합니다.`);
      }
    }
    if (situation.generation === "RAG+LLM" && situation.evidenceIds.length === 0) {
      issues.push(`${situation.id}는 RAG+LLM이지만 근거가 없습니다.`);
    }
  }

  for (const evidence of EVIDENCE) {
    for (const situationId of evidence.situations) {
      if (!situationIds.has(situationId)) {
        issues.push(`${evidence.id}가 존재하지 않는 ${situationId}를 참조합니다.`);
      }
    }
  }

  return issues;
}

/* =====================================================================
 *  응급 상황(A58) 사전 차단
 *  ─────────────────────────────────────────────────────────────────────
 *  LLM 분류를 신뢰하지 않는다. 응급 표현이 잡히면 분류기를 거치지 않고
 *  즉시 A58로 확정하고, 생성 단계도 건너뛴 고정 문구를 낸다.
 *  (근거: R11 — 응급 가능성이 있는 상황에서 스트레칭/휴식/공부 재개를
 *   먼저 권하지 않는다)
 *
 *  오탐(false positive)은 감수한다. "숨막혀"가 비유여도 119 안내가
 *  나가는 편이, 진짜 응급을 놓치는 것보다 낫다.
 * ===================================================================== */
const EMERGENCY_PATTERNS: RegExp[] = [
  // 가슴 통증 / 압박
  /가슴이?\s*(?:(?:너무|조금|갑자기|계속)\s*)?(아프|아파|아픔|조여|답답|짓눌|쥐어짜)/,
  /흉통|가슴\s*통증|심장이?\s*(아파|아프|조여|쥐어)/,
  // 호흡곤란
  /숨이?\s*(안\s*쉬어|안\s*쉬|막히|막혀|막힌|차|가빠|가쁘|턱)/,
  /호흡\s*곤란|숨쉬기\s*(힘들|어렵)/,
  // 실신 / 의식
  /기절|실신|졸도|의식이?\s*(없|흐|안)/,
  /쓰러(질|졌|져|지겠)|정신을?\s*잃/,
  // 기타 응급 경고
  /말이?\s*(어눌|안\s*나와)|한쪽이?\s*마비|마비(가|된|돼)/,
  /피를?\s*토|각혈|경련(이|을)?\s*(일어|나)/,
];

export function isEmergency(text: string): boolean {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  return EMERGENCY_PATTERNS.some((re) => re.test(t));
}

/** 응급 시 LLM을 거치지 않고 그대로 내보내는 고정 답변 (A58 / R11, R12) */
export function emergencyReply(): string {
  const s = situationById("A58");
  return (
    s?.template ??
    "공부를 바로 멈춰. 갑작스러운 가슴 통증, 호흡곤란, 실신이나 의식 저하는 응급상황일 수 있으니 혼자 버티지 말고 주변 사람에게 알리고 119에 연락해."
  );
}
