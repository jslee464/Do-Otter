/** 클라이언트에 노출해도 되는 RAG 응답 메타데이터. */
export type RagSource = {
  id: string;
  title: string;
  publisher: string;
  year: string;
  url?: string;
};

export type RagMetadata = {
  channel: "chat" | "event" | "ambient";
  situationId: string | null;
  evidenceIds: string[];
  sources: RagSource[];
  retrieval?: {
    mode: "curated" | "curated+keyword";
    candidateCount: number;
  };
  generation?: string;
  emergency?: boolean;
  fallback?: boolean;
};

export type RagApiPayload = Partial<Omit<RagMetadata, "channel">> & {
  line?: string | null;
  reply?: string | null;
  error?: string;
};

/** API의 알 수 없는 JSON을 UI에서 안전하게 쓸 수 있는 형태로 제한한다. */
export function ragMetadataFromApi(
  value: unknown,
  channel: RagMetadata["channel"]
): RagMetadata {
  const data = (value && typeof value === "object" ? value : {}) as RagApiPayload;
  const sources = Array.isArray(data.sources)
    ? data.sources.filter(
        (source): source is RagSource =>
          Boolean(
            source &&
              typeof source.id === "string" &&
              typeof source.title === "string" &&
              typeof source.publisher === "string" &&
              typeof source.year === "string"
          )
      )
    : [];
  const retrieval =
    data.retrieval &&
    (data.retrieval.mode === "curated" ||
      data.retrieval.mode === "curated+keyword") &&
    typeof data.retrieval.candidateCount === "number"
      ? data.retrieval
      : undefined;

  return {
    channel,
    situationId:
      typeof data.situationId === "string" ? data.situationId : null,
    evidenceIds: Array.isArray(data.evidenceIds)
      ? data.evidenceIds.filter((id): id is string => typeof id === "string")
      : [],
    sources,
    ...(retrieval ? { retrieval } : {}),
    ...(typeof data.generation === "string"
      ? { generation: data.generation }
      : {}),
    ...(data.emergency === true ? { emergency: true } : {}),
    ...(data.fallback === true ? { fallback: true } : {}),
  };
}
