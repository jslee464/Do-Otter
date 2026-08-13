"use client";

import { useEffect, useState } from "react";
import {
  backendMode,
  currentUsername,
  isOnboarded,
  saveBlockedApps,
  saveConsent,
  setOnboarded,
  signIn,
  signUp,
  type BlockedApp,
} from "../lib/backend";

const IMG = "/images";

type Step =
  | "intro1"
  | "intro2"
  | "intro3"
  | "auth"
  | "terms"
  | "apps"
  | "calendar"
  | "tutorial";
const ORDER: Step[] = ["auth", "terms", "apps", "calendar", "tutorial"];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("intro1");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [checking, setChecking] = useState(true);

  // 이미 로그인 + 온보딩 완료면 바로 메인으로
  useEffect(() => {
    (async () => {
      // 데모/미리보기용 딥링크: #ob-intro1, #ob-intro2, #ob-intro3, #ob-terms, ...
      const h = window.location.hash.replace("#ob-", "");
      if (
        [
          "intro1",
          "intro2",
          "intro3",
          "auth",
          "terms",
          "apps",
          "calendar",
          "tutorial",
        ].includes(h)
      ) {
        setStep(h as Step);
        setChecking(false);
        return;
      }
      const uname = await currentUsername();
      if (uname && (await isOnboarded())) {
        onDone();
        return;
      }
      if (uname) setStep("terms"); // 로그인은 됐는데 온보딩 미완료 → 이어서
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="ob">
        <IntroScreen screen={1} />
      </div>
    );
  }

  const idx = ORDER.indexOf(step);

  return (
    <div className="ob">
      {step === "intro1" && (
        <IntroScreen screen={1} onNext={() => setStep("intro2")} />
      )}
      {step === "intro2" && (
        <IntroScreen screen={2} onNext={() => setStep("intro3")} />
      )}
      {step === "intro3" && (
        <IntroScreen
          screen={3}
          onStart={() => {
            setAuthMode("signup");
            setStep("auth");
          }}
          onLogin={() => {
            setAuthMode("login");
            setStep("auth");
          }}
        />
      )}
      {step === "auth" && (
        <Auth
          initialMode={authMode}
          onAuthed={(fresh) => setStep(fresh ? "terms" : "terms")}
          onExisting={onDone}
        />
      )}
      {step === "terms" && (
        <Terms progress={idx} onNext={() => setStep("apps")} />
      )}
      {step === "apps" && (
        <Apps progress={idx} onNext={() => setStep("calendar")} />
      )}
      {step === "calendar" && (
        <CalendarConnect progress={idx} onNext={() => setStep("tutorial")} />
      )}
      {step === "tutorial" && (
        <Tutorial
          onFinish={async () => {
            await setOnboarded();
            onDone();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------- 1~3. Intro -------------------------- */
function IntroStatusBar() {
  return (
    <div className="intro-status" aria-hidden="true">
      <span>9:41 AM</span>
      <span className="intro-status-icons">
        <span className="intro-signal">▮▮▮</span>
        <span className="intro-wifi">⌁</span>
        <span className="intro-battery" />
      </span>
    </div>
  );
}

function IntroDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="intro-dots" aria-hidden="true">
      {[1, 2, 3].map((dot) => (
        <span key={dot} className={dot === current ? "on" : ""} />
      ))}
    </div>
  );
}

function IntroScreen({
  screen,
  onNext,
  onStart,
  onLogin,
}: {
  screen: 1 | 2 | 3;
  onNext?: () => void;
  onStart?: () => void;
  onLogin?: () => void;
}) {
  if (screen === 3) {
    return (
      <div className="ob-intro intro-3">
        <IntroStatusBar />
        <main className="intro-final">
          <h1>
            방해되는 앱은 잠시 쉬고,
            <br />
            집중은 오래 이어가요.
          </h1>
          <div className="intro-actions">
            <button className="intro-start" onClick={onStart}>
              시작하기 <span aria-hidden="true">→</span>
            </button>
            <p>
              이미 계정이 있으신가요?{" "}
              <button className="intro-login" onClick={onLogin}>
                로그인
              </button>
            </p>
          </div>
          <IntroDots current={3} />
        </main>
        <div className="intro-home-indicator" aria-hidden="true" />
      </div>
    );
  }

  const first = screen === 1;

  return (
    <div className={`ob-intro intro-${screen}`}>
      <IntroStatusBar />
      <button
        className="intro-tap"
        onClick={onNext}
        aria-label={`온보딩 ${screen} 화면, 다음 화면으로 이동`}
      >
        <div className="intro-visual">
          <img
            src={`${IMG}/${first ? "onboarding-peek.jpg" : "onboarding-cheer.jpg"}`}
            alt={first ? "벽 뒤에서 고개를 내민 수달" : "두 팔을 들고 응원하는 수달"}
          />
        </div>
        <h1>
          {first ? (
            "집중이 잘 흐트러지나요?"
          ) : (
            <>
              다시 집중할 수 있도록
              <br />
              <span className="intro-brand">Do-Otter</span>가 도와드릴게요.
            </>
          )}
        </h1>
        <IntroDots current={screen} />
      </button>
      <div className="intro-home-indicator" aria-hidden="true" />
    </div>
  );
}

/* ----------------------- 4. 로그인 / 회원가입 ----------------------- */
function Auth({
  initialMode,
  onAuthed,
  onExisting,
}: {
  initialMode: "signup" | "login";
  onAuthed: (fresh: boolean) => void;
  onExisting: () => void;
}) {
  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    setBusy(true);
    const res =
      mode === "signup"
        ? await signUp(username, password)
        : await signIn(username, password);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error || "문제가 발생했어요.");
      return;
    }
    if (mode === "login" && (await isOnboarded())) {
      onExisting();
    } else {
      onAuthed(mode === "signup");
    }
  }

  return (
    <>
      <div className="ob-scroll auth-scroll">
        <div className="ob-title">
          {mode === "signup" ? "회원가입" : "로그인"}
        </div>
        <div className="ob-sub">
          {mode === "login"
            ? "아이디와 비밀번호를 입력해주세요."
            : "아이디와 비밀번호로 시작해요."}{" "}
          <span className={`mode-chip ${backendMode === "supabase" ? "live" : "demo"}`}>
            {backendMode === "supabase" ? "● Supabase 연결" : "● 데모 모드"}
          </span>
        </div>

        <div className="seg">
          <button
            className={mode === "signup" ? "on" : ""}
            onClick={() => {
              setMode("signup");
              setErr("");
            }}
          >
            회원가입
          </button>
          <button
            className={mode === "login" ? "on" : ""}
            onClick={() => {
              setMode("login");
              setErr("");
            }}
          >
            로그인
          </button>
        </div>

        <div className="field">
          <label>아이디</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="otter_gongbu"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "signup"
                ? "6자 이상으로 작성해주세요."
                : "비밀번호를 입력해주세요."
            }
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div className="form-err">{err}</div>
      </div>
      <div className="ob-foot auth-foot">
        <button className="primary-btn" onClick={submit} disabled={busy}>
          {busy ? "잠시만요…" : mode === "signup" ? "가입하고 시작하기" : "로그인"}
        </button>
      </div>
    </>
  );
}

/* --------------------------- 3. 약관 동의 --------------------------- */
function Terms({
  progress,
  onNext,
}: {
  progress: number;
  onNext: () => void;
}) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [noti, setNoti] = useState(false);
  const [permissionNote, setPermissionNote] = useState("");
  const all = terms && privacy && noti;
  const canNext = terms && privacy; // 필수 2개
  const [busy, setBusy] = useState(false);

  async function setNotificationConsent(value: boolean) {
    if (!value) {
      setNoti(false);
      setPermissionNote("");
      return;
    }

    if (!("Notification" in window)) {
      setNoti(false);
      setPermissionNote("이 기기에서는 알림 권한 요청을 지원하지 않습니다.");
      return;
    }

    if (!window.isSecureContext) {
      setNoti(false);
      setPermissionNote("알림 권한은 보안 연결(HTTPS)에서 허용할 수 있습니다.");
      return;
    }

    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

    if (permission === "granted") {
      setNoti(true);
      setPermissionNote("");
      return;
    }

    setNoti(false);
    setPermissionNote(
      permission === "denied"
        ? "휴대폰 설정에서 Do-Otter 알림을 허용해주세요."
        : "알림 수신을 사용하려면 알림 권한을 허용해주세요.",
    );
  }

  async function toggleAll() {
    const v = !all;
    setTerms(v);
    setPrivacy(v);
    await setNotificationConsent(v);
  }

  async function next() {
    setBusy(true);
    await saveConsent({ terms, privacy, notifications: noti, calendar: false });
    setBusy(false);
    onNext();
  }

  return (
    <>
      <div className="ob-scroll terms-scroll">
        <ProgressDots n={ORDER.length} i={progress} />
        <div className="ob-title">약관에 동의해주세요</div>
        <div className="ob-sub">서비스 이용을 위해 아래 약관을 확인해주세요.</div>

        <div className="term-all" onClick={() => void toggleAll()}>
          <span className={`chk ${all ? "on" : ""}`}>✓</span>
          전체 동의하기
        </div>

        <Row label="서비스 이용약관" tag="req" on={terms} set={setTerms} />
        <Row label="개인정보 처리방침" tag="req" on={privacy} set={setPrivacy} />
        <Row
          label="알림 수신 (d-day·목표)"
          tag="opt"
          on={noti}
          set={setNotificationConsent}
        />
        {permissionNote && (
          <div className="permission-note" role="status">
            {permissionNote}
          </div>
        )}
      </div>
      <div className="ob-foot terms-foot">
        <button className="primary-btn" onClick={next} disabled={!canNext || busy}>
          동의하고 계속
        </button>
      </div>
    </>
  );

  function Row({
    label,
    tag,
    on,
    set,
  }: {
    label: string;
    tag: "req" | "opt";
    on: boolean;
    set: (v: boolean) => void | Promise<void>;
  }) {
    return (
      <div className="term-row" onClick={() => void set(!on)}>
        <span className={`chk ${on ? "on" : ""}`}>✓</span>
        <span style={{ flex: 1 }}>{label}</span>
        <span className={tag}>{tag === "req" ? "[필수]" : "[선택]"}</span>
      </div>
    );
  }
}

/* ------------------------- 4. 방해 앱 선택 ------------------------- */
type SelectableApp = BlockedApp & { icon?: string };
type NativeAppChoice = { key: string; name: string; icon?: string };

declare global {
  interface Window {
    DoOtterNative?: {
      pickInstalledApps: () =>
        | NativeAppChoice[]
        | Promise<NativeAppChoice[]>
        | string;
    };
  }
}

const APPS: SelectableApp[] = [
  { key: "instagram", name: "Instagram", icon: "/images/app-icons/instagram.png" },
  { key: "youtube", name: "YouTube", icon: "/images/app-icons/youtube.png" },
  { key: "tiktok", name: "TikTok", icon: "/images/app-icons/tiktok.png" },
  { key: "kakaotalk", name: "카카오톡", icon: "/images/app-icons/kakaotalk.png" },
  { key: "x", name: "X", icon: "/images/app-icons/x.png" },
  { key: "netflix", name: "Netflix", icon: "/images/app-icons/netflix.png" },
  {
    key: "webtoon",
    name: "네이버웹툰",
    icon: "/images/app-icons/naver-webtoon.png",
  },
  { key: "game", name: "게임", icon: "/images/app-icons/game.png" },
  { key: "coupang", name: "쿠팡", icon: "/images/app-icons/coupang.png" },
];

function Apps({ progress, onNext }: { progress: number; onNext: () => void }) {
  const [sel, setSel] = useState<Set<string>>(
    new Set(["instagram", "youtube", "tiktok"])
  );
  const [busy, setBusy] = useState(false);
  const [customApps, setCustomApps] = useState<SelectableApp[]>([]);
  const [pickerNote, setPickerNote] = useState("");
  const allApps = Array.from(
    new Map([...customApps, ...APPS].map((app) => [app.key, app])).values(),
  );

  function toggle(k: string) {
    const n = new Set(sel);
    n.has(k) ? n.delete(k) : n.add(k);
    setSel(n);
  }

  async function pickOtherApps() {
    setPickerNote("");
    const nativeBridge = window.DoOtterNative;

    if (!nativeBridge) {
      setPickerNote(
        "전체 앱 목록 선택은 휴대폰용 Do-Otter 앱에서\n사용할 수 있어요.",
      );
      return;
    }

    try {
      const result = await Promise.resolve(nativeBridge.pickInstalledApps());
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      if (!Array.isArray(parsed)) throw new Error("invalid app list");

      const picked = parsed.filter(
        (app): app is NativeAppChoice =>
          Boolean(app && typeof app.key === "string" && typeof app.name === "string"),
      );

      setCustomApps((current) => {
        const merged = new Map(current.map((app) => [app.key, app]));
        picked.forEach((app) => merged.set(app.key, app));
        return Array.from(merged.values());
      });
      setSel((current) => {
        const nextSelection = new Set(current);
        picked.forEach((app) => nextSelection.add(app.key));
        return nextSelection;
      });
    } catch {
      setPickerNote("앱 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  async function next() {
    setBusy(true);
    await saveBlockedApps(
      allApps
        .filter((app) => sel.has(app.key))
        .map(({ key, name }) => ({ key, name })),
    );
    setBusy(false);
    onNext();
  }

  return (
    <>
      <div className="ob-scroll apps-scroll">
        <ProgressDots n={ORDER.length} i={progress} />
        <div className="ob-title">방해되는 앱을 골라주세요</div>
        <div className="ob-sub">
          공부하는 동안 이 앱들을 켜면 Do-Otter가 화나요.
          <br />
          나중에 바꿀 수 있어요.
        </div>
        <div className="app-grid">
          {allApps.map((a) => (
            <div
              key={a.key}
              className={`app-tile ${sel.has(a.key) ? "on" : ""}`}
              onClick={() => toggle(a.key)}
            >
              <span className="acheck">✓</span>
              <div className="aemoji">
                {a.icon ? (
                  <img src={a.icon} alt={`${a.name} 아이콘`} />
                ) : (
                  <span aria-hidden="true">{a.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="aname">{a.name}</div>
            </div>
          ))}
        </div>
        <button className="other-app-btn" onClick={() => void pickOtherApps()}>
          다른 앱 선택하기
        </button>
        {pickerNote && (
          <div className="app-picker-note" role="status">
            {pickerNote}
          </div>
        )}
      </div>
      <div className="ob-foot apps-foot">
        <button className="primary-btn" onClick={next} disabled={busy}>
          선택 완료
        </button>
      </div>
    </>
  );
}

/* ----------------------- 5. 구글 캘린더 연동 ----------------------- */
function CalendarConnect({
  progress,
  onNext,
}: {
  progress: number;
  onNext: () => void;
}) {
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function link() {
    setBusy(true);
    // 프로토타입: 실제 OAuth 대신 연동 시뮬레이션
    await new Promise((r) => setTimeout(r, 800));
    await saveConsent({
      terms: true,
      privacy: true,
      notifications: true,
      calendar: true,
    });
    setBusy(false);
    setLinked(true);
  }

  return (
    <>
      <div className="ob-scroll calendar-scroll">
        <ProgressDots n={ORDER.length} i={progress} />
        <div className="ob-title">구글 캘린더 연동</div>
        <div className="ob-sub">
          시험과 과제 일정을 자동으로 불러와 D-day로 알려드려요.
        </div>
        <div className="gcal-card">
          <div className="gicon">📅</div>
          <div className="gt">Google Calendar</div>
          <div className="gd">
            {linked
              ? "연동이 완료됐어요!"
              : "일정을 동기화하려면 캘린더를 연결하세요."}
          </div>
          {linked && <div className="linked">✓ 연동 완료</div>}
        </div>
      </div>
      <div className="ob-foot calendar-foot">
        {!linked ? (
          <>
            <button className="primary-btn" onClick={link} disabled={busy}>
              {busy ? "연동 중…" : "구글 캘린더 연결하기"}
            </button>
            <button className="ghost-btn" onClick={onNext}>
              나중에 할게요
            </button>
          </>
        ) : (
          <button className="primary-btn" onClick={onNext}>
            계속
          </button>
        )}
      </div>
    </>
  );
}

/* --------------------------- 6. 튜토리얼 --------------------------- */
const TUT = [
  { emoji: "🏠", tt: "메인 화면", td: "공부 타이머 시작 버튼을 누르면 Study Mode가 시작돼요. 집중한 만큼 조개와 점수를 얻어요.", spot: 2 },
  { emoji: "📊", tt: "통계", td: "집중을 완료하면 총 공부시간, 외부 앱 사용시간 기록을 볼 수 있어요.", spot: 1 },
  { emoji: "📖", tt: "일정", td: "시험과 과제 D-day를 캘린더에서 확인해요", spot: 3 },
  { emoji: "⚙️", tt: "설정", td: "방해 앱 차단, 알림, 캘린더 연동을 관리해요.", spot: 4 },
];

function Tutorial({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const cur = TUT[i];
  const last = i === TUT.length - 1;
  return (
    <>
      {/* 뒤에 흐릿한 메인 목업 */}
      <MockHome />
      <div className="tut-dim" />
      <div className="tut-nav">
        {[0, 1, 2, 3, 4].map((s) => (
          <div key={s} className={`tut-spot ${cur.spot === s ? "hi" : ""}`}>
            {cur.spot === s && (
              <span className="tut-nav-icon" aria-hidden="true">
                {cur.emoji}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="tut-card" style={{ bottom: 100 }}>
        <div className="tt">{cur.tt}</div>
        <div className="td">{cur.td}</div>
        <button
          className="primary-btn"
          onClick={() => (last ? onFinish() : setI(i + 1))}
        >
          {last ? "첫 공부 시작하기 🦦" : "다음"}
        </button>
        {!last && (
          <button className="ghost-btn" onClick={onFinish}>
            건너뛰기
          </button>
        )}
      </div>
    </>
  );
}

function MockHome() {
  return (
    <div className="tut-mock">
      <div style={{ padding: "60px 24px" }}>
        <div className="avatar-wrap">
          <div className="avatar">
            <img src={`${IMG}/otter_default1.png`} alt="" />
          </div>
        </div>
        <div className="timer">00:00</div>
      </div>
    </div>
  );
}

/* ------------------------------ shared ------------------------------ */
function ProgressDots({ n, i }: { n: number; i: number }) {
  return (
    <div className="ob-progress">
      {Array.from({ length: n }).map((_, k) => (
        <span key={k} className={`ob-dot ${k === i ? "on" : ""}`} />
      ))}
    </div>
  );
}
