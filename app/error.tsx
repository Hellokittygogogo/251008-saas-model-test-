"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("nameGenerationResults");
        localStorage.removeItem("chinese_name_form_data");
        localStorage.removeItem("hasTriedFreeGeneration");
      }
    } catch (e) {}
    console.error("Client exception captured by GlobalError:", error);
  }, [error]);

  return (
    <html>
      <body style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFE4C4" }}>
        <div style={{ maxWidth: 640, padding: 24, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>页面发生了一个小问题</h2>
          <p style={{ marginTop: 12, color: "#555" }}>
            我们已清理本地缓存。请点击下面的按钮重新加载。如果问题仍然存在，请刷新页面或返回首页。
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <button onClick={() => reset()} style={{ padding: "8px 14px", borderRadius: 8, background: "#111827", color: "#fff" }}>重新加载</button>
            <a href="/" style={{ padding: "8px 14px", borderRadius: 8, background: "#F3F4F6", color: "#111827", textDecoration: "none" }}>返回首页</a>
          </div>
        </div>
      </body>
    </html>
  );
}
