import type { Metadata, Viewport } from "next";
import { Fredoka, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
// After globals so the 蛋仔 tokens win where the two stylesheets name the same class.
import "./grow/grow.css";

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
  title: "一起长大",
  description:
    "面向 1-3 岁家庭：分龄早教打卡、生长曲线与健康记录、宝宝听听，打卡攒的分用来把专属蛋仔养大。",
};

export const viewport: Viewport = {
  themeColor: "#2fc48b",
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
      <body className="min-h-full flex flex-col bg-[#eaeeff] font-sans">
        <noscript>
            <p className="bg-[#FFF7EE] p-6 text-center text-base font-bold text-[#3D2E28]">
            打开一起长大需要浏览器允许 JavaScript。
          </p>
        </noscript>
        {children}
      </body>
    </html>
  );
}
