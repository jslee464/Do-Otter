"use client";

import { useState } from "react";
import Onboarding from "./onboarding";
import MainApp from "./mainapp";

export default function Page() {
  const [view, setView] = useState<"onboarding" | "app">("onboarding");

  return (
    <div className="stage">
      <div className="tagline">
        <b>Do-Otter</b> · 수달이랑 공부하기 🦦 &nbsp;— 웹앱 프로토타입
      </div>
      <div className="phone">
        {view === "onboarding" ? (
          <div className="screen">
            <div className="notch" />
            <Onboarding onDone={() => setView("app")} />
          </div>
        ) : (
          <MainApp onSignOut={() => setView("onboarding")} />
        )}
      </div>
      <div className="tagline">
        회원가입 → 약관 → 방해앱 선택 → 캘린더 연동 → 튜토리얼 → 첫 공부 ·
        블루프린트 온보딩 순서 그대로
      </div>
    </div>
  );
}
