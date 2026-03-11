import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "upmo Admin",
  description: "upmo管理画面",
  icons: {
    icon: '/upmoadmin.png',
    shortcut: '/upmoadmin.png',
    apple: '/upmoadmin.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
