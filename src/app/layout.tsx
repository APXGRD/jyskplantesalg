import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { NewsletterProvider } from "@/context/NewsletterContext";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jysk Plantesalg – Nyhedsbrevsværktøj",
  description: "Vælg produkter til nyhedsbrevet",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="da" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NewsletterProvider>{children}</NewsletterProvider>
      </body>
    </html>
  );
}
