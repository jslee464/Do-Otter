"use client";
/* =====================================================================
 *  설정 뷰  — 담당: 설정
 * ===================================================================== */
import { useState } from "react";
import { type LV } from "../shared";
import { TopBar } from "../components/ui";
import { SHELL } from "../../lib/logic";
import { backendMode, type UserState } from "../../lib/backend";

export default function SettingsView(p: {
  state: UserState;
  lv: LV;
  onAd: () => void;
  onOops: () => void;
  onCustomize: () => void;
  onSignOut: () => void;
  dark: boolean;
  onDarkChange: (value: boolean) => void;
}) {
  const [block, setBlock] = useState(true);
  const [noti, setNoti] = useState(true);
  const [gcal, setGcal] = useState(true);
  const [notiTiming, setNotiTiming] = useState("자동");
  const [timerMode, setTimerMode] = useState("일반");
  const rows: [string, string, string, boolean, (v: boolean) => void][] = [
    ["📵", "방해 앱 차단", "공부 중 지정한 앱을 잠가요", block, setBlock],
    ["🔔", "알림", "d-day와 목표 알림을 받아요", noti, setNoti],
    ["📅", "구글 캘린더 연동", "일정을 자동으로 동기화해요", gcal, setGcal],
    ["🌙", "다크 모드", "밤에 눈이 편한 화면", p.dark, p.onDarkChange],
  ];
  return (
    <div className="view">
      <TopBar state={p.state} lv={p.lv} />
      <div className="section-title" style={{ marginTop: 14 }}>
        계정
        <span className={`mode-chip ${backendMode === "supabase" ? "live" : "demo"}`}>
          {backendMode === "supabase" ? "● Supabase" : "● 데모"}
        </span>
      </div>
      <div className="card account-card">
        <div className="set-item account-item">
          <div className="set-ico">🦦</div>
          <div className="set-txt">
            <div className="t">{p.state.username}</div>
            <div className="d">Lv.{p.lv.level}</div>
          </div>
        </div>
      </div>

      <div className="section-title">환경 설정</div>
      <div className="card">
        {rows.map(([e, t, d, val, set]) => (
          <div key={t} className="set-item">
            <div className="set-ico">{e}</div>
            <div className="set-txt">
              <div className="t">{t}</div>
              <div className="d">{d}</div>
            </div>
            <div className={`toggle ${val ? "on" : ""}`} onClick={() => set(!val)}>
              <div className="knob" />
            </div>
          </div>
        ))}
        <div className="set-item">
          <div className="set-ico">⏰</div>
          <div className="set-txt">
            <div className="t">유해앱 알림 시점</div>
            <div className="d">유해앱 사용 후 알림 타이밍</div>
          </div>
          <SegPick opts={["자동", "10분", "20분", "30분"]} val={notiTiming} set={setNotiTiming} />
        </div>
        <div className="set-item" style={{ borderBottom: "none" }}>
          <div className="set-ico">🍅</div>
          <div className="set-txt">
            <div className="t">타이머 모드</div>
            <div className="d">뽀모도로 등</div>
          </div>
          <SegPick opts={["일반", "뽀모도로"]} val={timerMode} set={setTimerMode} />
        </div>
      </div>

      <div className="section-title">수달 · 조개</div>
      <div className="card">
        <MenuRow ic="🎨" t="수달 커스텀 설정" d="아이템으로 수달이를 꾸며요" onClick={p.onCustomize} />
        <MenuRow ic="😊" t="수달 모드 설정" d="응원형 / 츤데레형 등" />
        <button className="wide-btn" onClick={p.onAd}>📺 광고 보고 조개 얻기 (+{SHELL.adWatch})</button>
        <button className="wide-btn pro">👑 Pro 수달 결제 (광고 제거 + 커스텀)</button>
      </div>

      <div className="section-title">체험하기</div>
      <div className="card">
        <div className="set-item" style={{ borderBottom: "none" }}>
          <div className="set-ico">🚫</div>
          <div className="set-txt">
            <div className="t">방해앱 사용 시뮬레이션</div>
            <div className="d">외부 앱 30분 사용 → 기록 + 수달 화남</div>
          </div>
        </div>
        <button className="danger-btn" onClick={p.onOops}>유해 앱 사용해보기 😾</button>
      </div>

      <button className="ghost-btn" onClick={p.onSignOut}>로그아웃</button>
    </div>
  );
}

function MenuRow({
  ic,
  t,
  d,
  onClick,
}: {
  ic: string;
  t: string;
  d: string;
  onClick?: () => void;
}) {
  return (
    <div className="set-item" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="set-ico">{ic}</div>
      <div className="set-txt">
        <div className="t">{t}</div>
        <div className="d">{d}</div>
      </div>
      <div className="chev">›</div>
    </div>
  );
}
function SegPick({ opts, val, set }: { opts: string[]; val: string; set: (v: string) => void }) {
  return (
    <div className="segpick">
      {opts.map((o) => (
        <button key={o} className={val === o ? "on" : ""} onClick={() => set(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
