import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/shared/TopNav";
import { AiProvider } from "@/lib/ai-context";
import { AiSidebar } from "@/components/ai/AiSidebar";
import { AiToggleButton } from "@/components/ai/AiToggleButton";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Credi Insights",
  description: "信用卡账单分析",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AiProvider>
          <TopNav />
          <main className="flex-1">{children}</main>
          <AiSidebar />
          <AiToggleButton />
        </AiProvider>
      </body>
    </html>
  );
}
