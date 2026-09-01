/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// 프로젝트에 테스트 러너가 없어, 검증 시에만 TypeScript 모듈을 CommonJS로 읽는다.
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { EVIDENCE, EVIDENCE_IDS } = require("../lib/rag/evidence.ts");
const {
  evidenceSources,
  isEmergency,
  retrieve,
  validateRagCorpus,
} = require("../lib/rag/retrieve.ts");
const {
  classifySituationByRules,
} = require("../lib/rag/classify.ts");
const { ragSituations } = require("../lib/rag/situations.ts");
const { normalizeTemplateText } = require("../lib/rag/prompt.ts");
const { groundedSystemPrompt } = require("../lib/rag/prompt.ts");
const {
  classificationCases,
  emergencyCases,
  retrievalCases,
} = require("./rag-eval-cases.cjs");

const issues = validateRagCorpus();
assert.deepEqual(issues, [], issues.join("\n"));
assert.equal(EVIDENCE.length, 38, "근거 코퍼스는 R1~R38이어야 합니다.");
assert.deepEqual(
  EVIDENCE.map((item) => item.id),
  EVIDENCE_IDS,
  "근거 ID는 R1부터 R38까지 순서대로 존재해야 합니다."
);
assert.equal(ragSituations().length, 35, "기존 13개 + 신규 22개 RAG 상황이어야 합니다.");

for (const [input, expected] of classificationCases) {
  assert.equal(
    classifySituationByRules(input),
    expected,
    `분류 실패: "${input}"`
  );
}
for (const [input, expected] of emergencyCases) {
  assert.equal(isEmergency(input), expected, `응급 감지 실패: "${input}"`);
}
assert.equal(
  normalizeTemplateText("오늘은 {남은 범위}부터 하자."),
  "오늘은 남은 범위부터 하자."
);

const mathPlan = retrieve("A16", {
  query: "수학 문제 유형을 섞어서 연습하고 싶어",
  maxEvidence: 4,
});
assert.ok(mathPlan);
assert.equal(mathPlan.retrieval.mode, "curated+keyword");
assert.equal(mathPlan.evidence[0].id, "R17", "수학 교차연습 근거가 우선이어야 합니다.");
assert.ok(mathPlan.evidence.every((item) => mathPlan.situation.evidenceIds.includes(item.id)));

const streak = retrieve("A39", { query: "스트릭이 오늘 끊길 것 같아" });
assert.ok(streak);
assert.ok(streak.evidence.some((item) => item.id === "R31"));
assert.ok(evidenceSources(streak).every((source) => source.title && source.publisher));

for (const testCase of retrievalCases) {
  const hit = retrieve(testCase.situationId, {
    query: testCase.query,
    maxEvidence: 4,
  });
  assert.ok(hit, `검색 실패: ${testCase.situationId}`);
  assert.equal(hit.retrieval.mode, "curated+keyword");
  assert.ok(
    hit.evidence.every((item) => hit.situation.evidenceIds.includes(item.id)),
    `${testCase.situationId}에서 검수 후보군 밖 근거가 검색됐습니다.`
  );
  if (testCase.expectedFirst) {
    assert.equal(hit.evidence[0]?.id, testCase.expectedFirst);
  }
  if (testCase.expectedIncluded) {
    assert.ok(hit.evidence.some((item) => item.id === testCase.expectedIncluded));
  }
}

for (const situation of ragSituations()) {
  const hit = retrieve(situation.id);
  assert.ok(hit);
  assert.ok(hit.evidence.length > 0, `${situation.id}의 근거가 비어 있습니다.`);
  assert.equal(
    evidenceSources(hit).length,
    hit.evidence.length,
    `${situation.id}의 출처 메타데이터가 누락됐습니다.`
  );
}

const safetyHit = retrieve("A53");
assert.ok(safetyHit);
const safetyPrompt = groundedSystemPrompt(safetyHit, {
  username: "평가 사용자",
  level: 1,
  streak: 0,
  todayEffectiveMin: 0,
  todayHarmfulMin: 0,
  last7StudyMin: 0,
  last7HarmfulCount: 0,
  last7HarmfulMin: 0,
  totalEffectiveMin: 0,
  totalStopMin: 0,
  totalHarmfulMin: 0,
  nearestDday: null,
  schedules: [],
});
for (const requiredRule of [
  "진단하거나 질환명을 추정하지 않는다",
  "특정 약물, 복용량, 영양제, 치료법을 권하지 않는다",
  "검색된 근거에 없는 효과, 수치, 인과관계를 새로 만들지 않는다",
  "성적, 생산성, 집중력 향상을 보장하지 않는다",
]) {
  assert.ok(safetyPrompt.includes(requiredRule), `안전 규칙 누락: ${requiredRule}`);
}

console.log(
  `RAG validation passed: ${EVIDENCE.length} evidence, ${ragSituations().length} grounded situations, ` +
    `${classificationCases.length} classification, ${emergencyCases.length} emergency, ` +
    `${retrievalCases.length} retrieval cases.`
);
