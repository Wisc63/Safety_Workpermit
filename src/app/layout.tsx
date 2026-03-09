import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Work Permit | สหมิตรถังแก๊ส จำกัด (มหาชน)",
  description: "ระบบบันทึกประวัติ Work Permit หน่วยงานความปลอดภัย บริษัทสหมิตรถังแก๊ส จำกัด (มหาชน)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${notoSansThai.variable} antialiased bg-gray-50 min-h-screen`} style={{fontFamily: "var(--font-noto-thai), sans-serif"}}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
