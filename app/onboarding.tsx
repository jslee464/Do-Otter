"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  backendMode,
  currentUsername,
  isOnboarded,
  saveBlockedApps,
  saveConsent,
  setOnboarded,
  signIn,
  signInWithGoogle,
  signUp,
  type BlockedApp,
} from "../lib/backend";
import { checkSupabaseConnection } from "../lib/supabase";
import pollutedRiver from "../오염된 강.png";
import ottiArrival from "../Otti 등장.png";
import riverCleanup from "../강 청소.png";
import riverBefore from "../집중 전 막힌 강.png";
import instagramIcon from "../01_instagram_pixel_kitsch_v2.png";
import youtubeIcon from "../02_youtube_pixel_kitsch_v2.png";
import tiktokIcon from "../03_tiktok_pixel_kitsch_v2.png";
import xIcon from "../06_x_pixel_kitsch_v2.png";
import { NavIcon, StatusBar, type NavIconKind } from "./components/ui";

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

function IntroDots({ active }: { active: number }) {
  return (
    <div className="intro-dots" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className={dot === active ? "on" : ""} />
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
  const stories = {
    1: {
      image: pollutedRiver.src,
      title: <>집중을 방해하는 것들이 강을<br />막고 있어요.</>,
      description: "알림, SNS, 짧은 영상의 흔적이 물길을 가로막고 있어요.",
    },
    2: {
      image: ottiArrival.src,
      title: <>Otti가 강을 청소하러 왔어요.</>,
      description: "강이 다시 흐를 수 있도록 Otti와 함께 도와주세요.",
    },
    3: {
      image: riverCleanup.src,
      title: <>집중할수록 강이 다시 흐르기<br />시작해요.</>,
      description: "내 집중이 Otti의 강 청소와 가상 강 회복으로 이어져요.",
    },
  } as const;
  const story = stories[screen];

  return (
    <div className={`ob-intro intro-${screen}`}>
      <IntroStatusBar />
      <div className="intro-tap">
        <div className="intro-visual">
          <img src={story.image} alt="Otti의 강 이야기" />
        </div>
        <div className="intro-copy">
          <h1>{story.title}</h1>
          <p>{story.description}</p>
        </div>
        {screen === 3 ? (
          <div className="intro-actions">
            <button className="intro-start" onClick={onStart}>
              함께 시작하기 <span aria-hidden="true">→</span>
            </button>
            <p>
              이미 계정이 있으신가요?{" "}
              <button className="intro-login" onClick={onLogin}>로그인</button>
            </p>
          </div>
        ) : (
          <button className="intro-next-hit" onClick={onNext} aria-label="다음 화면" />
        )}
        <IntroDots active={screen - 1} />
      </div>
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
  const [nickname, setNickname] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<"demo" | "checking" | "online" | "offline">(
    backendMode === "demo" ? "demo" : "checking",
  );

  useEffect(() => {
    if (backendMode === "demo") return;
    let active = true;
    void checkSupabaseConnection().then((online) => {
      if (active) setConnection(online ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

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

  async function continueWithGoogle() {
    setErr("");
    setBusy(true);
    const res = await signInWithGoogle();
    setBusy(false);
    if (!res.ok) {
      setErr(
        res.error === "demo"
          ? "Supabase Google 로그인이 아직 설정되지 않았어요."
          : res.error || "Google 로그인을 시작하지 못했어요."
      );
    }
  }

  return (
    <>
      <div className={`ob-scroll auth-scroll ${mode}`}>
        <div className={`auth-hero ${mode}`}>
          <img src={ottiArrival.src} alt="강가에서 인사하는 Otti" />
        </div>
        <div className="ob-title">
          {mode === "signup" ? "회원가입" : "로그인"}
        </div>
        <div className="ob-sub">
          {mode === "signup" ? "Otti와 함께 집중 습관을 시작해요." : "다시 만나서 반가워요!"}{" "}
          <span className={`mode-chip ${backendMode === "supabase" ? "live" : "demo"}`}>
            {backendMode === "supabase" ? "연결됨" : "데모"}
          </span>
        </div>

        {connection === "offline" && (
          <div className="auth-connection-note" role="status">
            Supabase 프로젝트에 연결할 수 없어요. 프로젝트 URL과 상태를 확인해주세요.
          </div>
        )}

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

        <div className="field auth-field">
          <AuthFieldIcon kind="user" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <div className="field auth-field">
          <AuthFieldIcon kind="lock" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        {mode === "signup" && (
          <div className="field auth-field">
            <AuthFieldIcon kind="smile" />
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
            />
          </div>
        )}
        <div className="form-err">{err}</div>
        {mode === "login" && (
          <>
            <button
              className="auth-forgot"
              type="button"
              onClick={() => {
                setMode("signup");
                setErr("");
              }}
            >
              회원가입하기
            </button>
            <div className="auth-or"><span>또는</span></div>
            <button className="google-btn" onClick={continueWithGoogle} disabled={busy}>
              <b>G</b> Google로 계속하기
            </button>
          </>
        )}
      </div>
      <div className="ob-foot auth-foot">
        <button className="primary-btn" onClick={submit} disabled={busy}>
          {busy ? "잠시만요…" : mode === "signup" ? "가입하고 시작하기" : "로그인"}
        </button>
        {mode === "signup" && (
          <p className="auth-account-switch">
            이미 계정이 있으신가요?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErr("");
              }}
            >
              로그인
            </button>
          </p>
        )}
      </div>
    </>
  );
}

function AuthFieldIcon({ kind }: { kind: "user" | "lock" | "smile" }) {
  return (
    <span className="auth-field-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        {kind === "user" && (
          <>
            <circle cx="12" cy="7.5" r="3.5" />
            <path d="M5 21v-1.7A7 7 0 0 1 12 12.5a7 7 0 0 1 7 6.8V21" />
          </>
        )}
        {kind === "lock" && (
          <>
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8.5 10V7.2a3.5 3.5 0 0 1 7 0V10" />
            <path d="M12 14.5v2.5" />
          </>
        )}
        {kind === "smile" && (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 10h.01M15.5 10h.01" />
            <path d="M8 14.5a5 5 0 0 0 8 0" />
          </>
        )}
      </svg>
    </span>
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
  const [busy, setBusy] = useState(false);

  async function next() {
    setBusy(true);
    await saveConsent({ terms: true, privacy: true, notifications: true, calendar: false });
    setBusy(false);
    onNext();
  }

  return (
    <>
      <div className="consent-status-bar" aria-hidden="true">
        <span>9:41</span>
        <svg viewBox="0 0 58 16" fill="none">
          <path d="M2 14V10M6 14V7M10 14V4M14 14V1" />
          <path d="M21 6.5a10 10 0 0 1 14 0M24 9.5a6 6 0 0 1 8 0M27 12.3a2 2 0 0 1 2 0" />
          <rect x="41" y="3" width="14" height="9" rx="2" />
          <path d="M57 6v3" />
          <rect className="consent-battery-fill" x="43" y="5" width="10" height="5" rx="1" />
        </svg>
      </div>
      <div className="ob-scroll terms-scroll">
        <ProgressDots n={ORDER.length} i={progress} />
        <div className="consent-otti">
          <img src={`${IMG}/do-otter_shield_2048.png`} alt="방패를 든 Otti" />
        </div>
        <div className="ob-title">집중을 방해하는 앱을<br />감지할까요?</div>
        <div className="ob-sub">선택한 앱을 열면 Otti가 집중으로 돌아갈 수 있도록<br />알려줘요.</div>
        <div className="consent-list">
          <ConsentFeature icon="bell" title="선택한 앱 사용 감지" text="방해 앱 실행을 감지해요." />
          <ConsentFeature icon="clock" title="집중 기록에 사용 시간 저장" text="나의 집중 흐름을 정확히 기록해요." />
          <ConsentFeature icon="settings" title="언제든 설정에서 해제" text="원할 때 언제든 끌 수 있어요." />
          <ConsentFeature icon="lock" title="메시지 내용은 읽지 않아요." text="개인 정보와 대화 내용은 안전하게 보호돼요." safe />
        </div>
      </div>
      <div className="ob-foot terms-foot">
        <button className="primary-btn" onClick={next} disabled={busy}>
          동의하고 계속
        </button>
        <button className="ghost-btn" onClick={onNext}>나중에 설정</button>
      </div>
    </>
  );
}

type ConsentIconKind = "bell" | "clock" | "settings" | "lock";

function ConsentIcon({ kind }: { kind: ConsentIconKind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === "bell" && (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
          <path d="M9.7 21h4.6" />
        </>
      )}
      {kind === "clock" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </>
      )}
      {kind === "settings" && (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.7" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
        </>
      )}
      {kind === "lock" && (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" />
          <path d="M12 14.5v2.5" />
        </>
      )}
    </svg>
  );
}

function ConsentFeature({ icon, title, text, safe = false }: { icon: ConsentIconKind; title: string; text: string; safe?: boolean }) {
  return (
    <div className={`consent-feature ${safe ? "safe" : ""}`}>
      <span className="cf-icon"><ConsentIcon kind={icon} /></span>
      <div><b>{title}</b><small>{text}</small></div>
    </div>
  );
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
const APP_EMOJI: Record<string, string> = {
  instagram: "📸",
  youtube: "▶️",
  tiktok: "🎵",
  kakaotalk: "💬",
  x: "🐦",
  netflix: "🎬",
  webtoon: "📖",
  game: "🎮",
  coupang: "🛒",
};
const APP_ICONS: Record<string, string> = {
  instagram: instagramIcon.src,
  youtube: youtubeIcon.src,
  tiktok: tiktokIcon.src,
  x: xIcon.src,
};

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
  const recommended = new Set(["instagram", "youtube", "tiktok"]);

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
        <div className="apps-heading">
          <img src={`${IMG}/face_happy.png`} alt="Otti" />
          <div className="ob-title">집중할 때<br />잠시 멀리할 앱을 골라주세요.</div>
        </div>
        <div className="ob-sub">
          추천 앱은 미리 선택했어요.<br />설정에서 언제든 변경할 수 있어요.
        </div>
        <div className="app-list">
          {APPS.filter((a) => ["instagram", "youtube", "tiktok", "x"].includes(a.key)).map((a) => (
            <div
              key={a.key}
              className={`app-row ${sel.has(a.key) ? "on" : ""}`}
              onClick={() => toggle(a.key)}
            >
              <div className="aemoji">{APP_ICONS[a.key] ? <img src={APP_ICONS[a.key]} alt="" /> : APP_EMOJI[a.key]}</div>
              <div className="aname">{a.name}</div>
              <span className="recommend">추천</span>
              <span className="app-switch"><i /></span>
            </div>
          ))}
          <div className="app-row add-more"><div className="aemoji">＋</div><div className="aname">직접 추가</div><span className="app-switch"><i /></span></div>
        </div>
        <button className="other-app-btn" onClick={() => void pickOtherApps()}>
          다른 앱 선택하기
        </button>
        {pickerNote && (
          <div className="app-picker-note" role="status">
            {pickerNote}
          </div>
        )}
        <p className="native-block-note">
          실제 앱 차단은 iOS·Android의 네이티브 권한 연동 후 사용할 수 있어요.
        </p>
      </div>
      <div className="ob-foot apps-foot">
        <button className="primary-btn" onClick={next} disabled={busy}>
          {sel.size}개 앱 선택 완료
        </button>
        <button className="ghost-btn" onClick={onNext}>나중에 설정</button>
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
const TUTORIAL_NAV: { key: NavIconKind; label: string }[] = [
  { key: "impact", label: "영향" },
  { key: "stats", label: "기록" },
  { key: "home", label: "홈" },
  { key: "calendar", label: "일정" },
  { key: "settings", label: "설정" },
];

const TUT: { icon: NavIconKind; tt: string; td: string; spot: number }[] = [
  {
    icon: "home",
    tt: "메인 화면",
    td: "공부 타이머 시작 버튼을 누르면 Study Mode가 시작돼요. 집중한 만큼 조개와 점수를 얻어요.",
    spot: 2,
  },
  {
    icon: "stats",
    tt: "기록",
    td: "집중을 완료하면 총 공부 시간과 방해 앱 사용 기록을 볼 수 있어요.",
    spot: 1,
  },
  {
    icon: "calendar",
    tt: "일정",
    td: "시험과 과제 D-day를 캘린더에서 확인해요.",
    spot: 3,
  },
  {
    icon: "settings",
    tt: "설정",
    td: "방해 앱 차단, 알림, 캘린더 연동을 관리해요.",
    spot: 4,
  },
];

function Tutorial({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const cur = TUT[i];
  const last = i === TUT.length - 1;
  return (
    <>
      {/* 현재 메인 화면을 그대로 반영한 튜토리얼 배경 */}
      <MockHome />
      <div className="tut-dim" />
      <div className="tut-nav">
        {TUTORIAL_NAV.map((item, s) => (
          <div key={s} className={`tut-spot ${cur.spot === s ? "hi" : ""}`}>
            {cur.spot === s && (
              <span className="tut-nav-icon" aria-hidden="true">
                <NavIcon kind={item.key} active />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="tut-card">
        <div className="tt">{cur.tt}</div>
        <div className="td">{cur.td}</div>
        <button
          className="primary-btn"
          onClick={() => (last ? onFinish() : setI(i + 1))}
        >
          {last ? "첫 집중 시작하기" : "다음"}
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
      <StatusBar />
      <div className="view hf-home hf-setup tutorial-home-view" aria-hidden="true">
        <header className="home-heading">
          <div>
            <span>Otti와 오늘의 집중</span>
            <h1>오늘은 강을 얼마나<br />회복시켜볼까요?</h1>
          </div>
          <button type="button" tabIndex={-1}>
            <img src={`${IMG}/do-otter_face_2048.png`} alt="" />
          </button>
        </header>

        <div className="focus-tip">
          <img src={`${IMG}/do-otter_pointing_2048.png`} alt="" />
          <b>25분 집중하면<br />강이 한 칸 더 맑아져요.</b>
        </div>

        <div className="river-preview">
          <img src={riverBefore.src} alt="" />
        </div>

        <section className="timer-setup-card">
          <div className="timer-caption">집중 시간</div>
          <div className="timer-editor">
            <b>25:00</b>
            <div>
              <button type="button" tabIndex={-1}>−5분</button>
              <button type="button" tabIndex={-1}>+5분</button>
            </div>
          </div>
          <div className="minute-picks">
            {[10, 25, 45, 60].map((minute) => (
              <button key={minute} className={minute === 25 ? "on" : ""} type="button" tabIndex={-1}>
                {minute}분
              </button>
            ))}
          </div>
          <input tabIndex={-1} aria-label="집중할 일" placeholder="예: 발표 자료 정리" />
          <button className="hf-primary" type="button" tabIndex={-1}>집중 시작</button>
        </section>
      </div>

      <div className="nav tutorial-base-nav" aria-hidden="true">
        {TUTORIAL_NAV.map((item) => (
          <div key={item.key} className={`nav-btn ${item.key === "home" ? "active" : ""}`}>
            <NavIcon kind={item.key} active={item.key === "home"} />
            <span className="nlabel">{item.label}</span>
          </div>
        ))}
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
