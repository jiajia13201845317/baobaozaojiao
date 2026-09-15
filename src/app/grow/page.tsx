import type { Metadata } from "next";
import { GrowApp } from "@/components/grow/grow-app";

export const metadata: Metadata = {
  title: "一起长大 · 早教打卡与健康记录",
  description:
    "面向 1-3 岁家庭：分龄早教微任务、WHO 生长曲线、疫苗提醒，打卡攒的分用来把专属宠物养大。",
};

/** Kept alongside / because the first public link pointed here. */
export default function GrowPage() {
  return <GrowApp />;
}
