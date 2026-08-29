"use client";

import { useEffect, useState } from "react";
import Onboarding from "./onboarding";
import MainApp from "./mainapp";
import ProAd from "./components/ProAd";

export default function Page() {
  const [view, setView] = useState<"onboarding" | "app">("onboarding");
  const [previewProAd, setPreviewProAd] = useState(false);
  const [previewMain, setPreviewMain] = useState<"home" | "impact" | "complete" | null>(null);

  useEffect(() => {
    const syncProAdPreview = () => {
      setPreviewProAd(window.location.hash === "#preview-pro-ad");
      const previewHash = window.location.hash.replace("#preview-", "");
      setPreviewMain(
        previewHash === "main"
          ? "home"
          : previewHash === "impact" || previewHash === "complete"
            ? previewHash
            : null,
      );
    };

    syncProAdPreview();
    window.addEventListener("hashchange", syncProAdPreview);
    return () => window.removeEventListener("hashchange", syncProAdPreview);
  }, []);

  useEffect(() => {
    const screen = Number(window.location.hash.replace("#screen-", ""));
    if (screen >= 9 && screen <= 27) setView("app");
  }, []);

  return (
    <div className="stage">
      <div className="tagline">
        <b>Do-Otter</b> · Otti와 강을 회복하는 집중 타이머
      </div>
      <div className="phone">
        {previewMain ? (
          <MainApp preview={previewMain} onSignOut={() => setPreviewMain(null)} />
        ) : view === "onboarding" ? (
          <div className="screen">
            <div className="notch" />
            <Onboarding onDone={() => setView("app")} />
            {previewProAd && (
              <ProAd
                onClose={() => setPreviewProAd(false)}
                onHideWeek={() => setPreviewProAd(false)}
                onOpenPro={() => setPreviewProAd(false)}
              />
            )}
          </div>
        ) : (
          <MainApp onSignOut={() => setView("onboarding")} />
        )}
      </div>
      <div className="tagline">
        강이 막힘 → Otti 등장 → 함께 청소 시작 → 첫 집중
      </div>
    </div>
  );
}
