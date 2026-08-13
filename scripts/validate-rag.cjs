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

const issues = validateRagCorpus();
assert.deepEqual(issues, [], issues.join("\n"));
assert.equal(EVIDENCE.length, 38, "근거 코퍼스는 R1~R38이어야 합니다.");
assert.deepEqual(
  EVIDENCE.map((item) => item.id),
  EVIDENCE_IDS,
  "근거 ID는 R1부터 R38까지 순서대로 존재해야 합니다."
);
assert.equal(ragSituations().length, 35, "기존 13개 + 신규 22개 RAG 상황이어야 합니다.");

assert.equal(classifySituationByRules("시험이 내일인데 뭘 복습해야 하지?"), "A17");
assert.equal(classifySituationByRules("과제 제출이 내일인데 아직 시작도 못 했어"), "A29");
assert.equal(classifySituationByRules("불안해서 공부에 집중이 안 돼"), "A52");
assert.equal(classifySituationByRules("알림을 계속 닫고 무시하게 돼"), "A50");
assert.equal(classifySituationByRules("안녕 수달아"), null);
assert.equal(isEmergency("갑자기 가슴이 너무 아프고 숨쉬기 힘들어"), true);
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

console.log(
  `RAG validation passed: ${EVIDENCE.length} evidence records, ${ragSituations().length} grounded situations.`
);
