import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use standard next/font
import "./globals.css";
import { Navbar } from "@/components/ui/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Navixa - Personalized Learning Path",
  description: "AI-powered career guidance and learning paths.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className} suppressHydrationWarning>
        <Navbar />
        <main className="md:pt-16 pb-20 md:pb-0 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
