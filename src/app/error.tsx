"use client";

export default function ErrorView({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6 text-center">
      <h1 className="ink text-2xl font-black">这一页卡住了</h1>
      <p className="ink-soft mt-2 max-w-xs text-sm font-bold">点下面再试一次。如果还是白屏，请刷新页面。</p>
      <button type="button" onClick={reset} className="candy-btn mt-6">
        <span>再试一次</span>
      </button>
    </main>
  );
}
