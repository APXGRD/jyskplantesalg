import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { NewsletterProvider } from "@/context/NewsletterContext";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Jysk Plantesalg – Nyhedsbrevsværktøj",
  description: "Nyhedsbrev-generator til Jysk Plantesalg",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="da"
      className={`${dmSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NewsletterProvider>{children}</NewsletterProvider>
      </body>
    </html>
  );
}
