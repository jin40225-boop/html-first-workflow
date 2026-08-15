"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function PostQr({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: 240, margin: 1, errorCorrectionLevel: "M", color: { dark: "#2d251a", light: "#ffffff" } })
      .then((next) => { if (alive) setSrc(next); }).catch(() => { if (alive) setSrc(""); });
    return () => { alive = false; };
  }, [value]);
  return <section className="post-qr-panel">
    {src ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${label} 的 QR Code`} />
    </> : <div className="qr-loading">QR</div>}
    <div><strong>{label}</strong><span>{value}</span></div>
  </section>;
}
