import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ぐるっとスタンプラリー",
  description: "春日市デジタルスタンプラリー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-50 flex flex-col">{children}</body>
    </html>
  );
}
