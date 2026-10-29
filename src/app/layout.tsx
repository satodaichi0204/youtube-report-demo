import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-noto", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://youtube-report-demo.vercel.app"),
  title: { default: "YouTube 分析レポート（デモ）", template: "%s｜YouTube 分析レポート（デモ）" },
  description: "動画ごとの数値の推移、検索キーワード、視聴者を、毎朝そろうレポートにしたデモ。取れるデータ、条件つきのデータ、取れないデータを、画面の上で示します。数値はすべて架空です。",
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
