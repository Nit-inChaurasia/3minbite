import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "3 Min Bite — Know everything. Read nothing.",
  description:
    "Personalized daily intelligence for high-performing founders and investors. Signal, no noise — delivered in 180 seconds.",
  openGraph: {
    title: "3 Min Bite — Know everything. Read nothing.",
    description:
      "Personalized daily intelligence for high-performing founders and investors.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
