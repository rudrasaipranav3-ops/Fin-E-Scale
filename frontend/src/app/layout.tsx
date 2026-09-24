// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // You can choose a more futuristic font later
import "./globals.css";
import { cn } from "@/lib/utils"; // Import cn for utility classes

const inter = Inter({ subsets: ["latin"] }); // Or a cyberpunk-style font

export const metadata: Metadata = {
  title: "E-Commerce Customer Analytics Platform",
  description: "AI-Driven Business Intelligence for Modern Retail",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-dark-background font-sans antialiased",
          inter.className
        )}
      >
        {children}
      </body>
    </html>
  );
}