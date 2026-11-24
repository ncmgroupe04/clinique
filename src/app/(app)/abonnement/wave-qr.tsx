"use client";

import { QRCodeSVG } from "qrcode.react";

export default function WaveQr({ url }: { url: string }) {
  return <QRCodeSVG value={url} size={200} level="M" includeMargin bgColor="#ffffff" fgColor="#0b1f2a" />;
}
