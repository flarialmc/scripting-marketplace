import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flarial Marketplace",
  description: "Marketplace for Flarial scripts",
  metadataBase: new URL('https://marketplace.flarial.xyz'),
};

export async function generateHeaders() {
  return [
    {
      key: 'Content-Security-Policy',
      value: "default-src 'self'; connect-src 'self' https://1klcjc8um5aq.flarial.xyz; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
    }
  ];
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
