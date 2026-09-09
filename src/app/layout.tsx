import type { Metadata, Viewport } from "next";
import { Fredoka, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const rounded = Fredoka({
  subsets: ["latin"],
  variable: "--font-rounded",
});

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "宝宝听听",
  description: "小乖乖的声音乐园：中文儿歌、英文儿歌、动物叫声和寓言故事。",
};

export const viewport: Viewport = {
  themeColor: "#FFF7EE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${rounded.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <noscript>
            <p className="bg-[#FFF7EE] p-6 text-center text-base font-bold text-[#3D2E28]">
            打开宝宝听听需要浏览器允许 JavaScript。
          </p>
        </noscript>
        {children}
      </body>
    </html>
  );
}
