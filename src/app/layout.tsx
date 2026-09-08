import type { Metadata, Viewport } from "next";
import { Fredoka, Noto_Sans_SC, ZCOOL_KuaiLe } from "next/font/google";
import "./globals.css";

const display = ZCOOL_KuaiLe({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const rounded = Fredoka({
  subsets: ["latin"],
  variable: "--font-rounded",
});

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "宝宝听听",
  description: "给一岁宝宝的语音小玩具：中文儿歌、英文儿歌、动物叫声和寓言故事。",
};

export const viewport: Viewport = {
  themeColor: "#FFF4E0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${display.variable} ${rounded.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
