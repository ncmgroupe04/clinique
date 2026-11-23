import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tickets de caisse",
  description: "Plateforme de tickets pour structures de santé",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body className="min-h-screen bg-[#EEF3F6] text-[#0B1F2A] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}