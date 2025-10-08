"use client";
import React from "react";

export default class ClientErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("nameGenerationResults");
        localStorage.removeItem("chinese_name_form_data");
        localStorage.removeItem("hasTriedFreeGeneration");
      }
    } catch {}
    console.error("ClientErrorBoundary captured:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{maxWidth:640,padding:24,background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}>
            <h3 style={{margin:0}}>页面出现了一个小问题</h3>
            <p style={{color:"#555"}}>已清理本地缓存，请刷新页面或返回首页重试。</p>
            <div style={{display:"flex",gap:12}}>
              <button onClick={() => (typeof window!=="undefined" && window.location.reload())} style={{padding:"8px 14px",borderRadius:8,background:"#111827",color:"#fff"}}>刷新</button>
              <a href="/" style={{padding:"8px 14px",borderRadius:8,background:"#F3F4F6",color:"#111827",textDecoration:"none"}}>返回首页</a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
