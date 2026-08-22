import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./design-system.css";

export const metadata: Metadata = {
  title: "Do-Otter · Otti와 강을 회복하는 집중 타이머",
  description: "집중한 만큼 가상 강의 물길을 회복하는 Do-Otter 집중 타이머",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FBFAF6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
