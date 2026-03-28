import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/* ─── GT Super Display (Headings) ─── */
const gtSuperDisplay = localFont({
  src: [
    { path: "./fonts/GT-Super-Display-Light-Trial.otf", weight: "300", style: "normal" },
    { path: "./fonts/GT-Super-Display-Light-Italic-Trial.otf", weight: "300", style: "italic" },
    { path: "./fonts/GT-Super-Display-Regular-Trial.otf", weight: "400", style: "normal" },
    { path: "./fonts/GT-Super-Display-Regular-Italic-Trial.otf", weight: "400", style: "italic" },
    { path: "./fonts/GT-Super-Display-Medium-Trial.otf", weight: "500", style: "normal" },
    { path: "./fonts/GT-Super-Display-Medium-Italic-Trial.otf", weight: "500", style: "italic" },
    { path: "./fonts/GT-Super-Display-Bold-Trial.otf", weight: "700", style: "normal" },
    { path: "./fonts/GT-Super-Display-Bold-Italic-Trial.otf", weight: "700", style: "italic" },
  ],
  variable: "--font-gt-super-display",
  display: "swap",
});

/* ─── GT Super Text (Body) ─── */
const gtSuperText = localFont({
  src: [
    { path: "./fonts/GT-Super-Text-Book-Trial.otf", weight: "400", style: "normal" },
    { path: "./fonts/GT-Super-Text-Book-Italic-Trial.otf", weight: "400", style: "italic" },
    { path: "./fonts/GT-Super-Text-Regular-Trial.otf", weight: "450", style: "normal" },
    { path: "./fonts/GT-Super-Text-Regular-Italic-Trial.otf", weight: "450", style: "italic" },
    { path: "./fonts/GT-Super-Text-Medium-Trial.otf", weight: "500", style: "normal" },
    { path: "./fonts/GT-Super-Text-Medium-Italic-Trial.otf", weight: "500", style: "italic" },
    { path: "./fonts/GT-Super-Text-Bold-Trial.otf", weight: "700", style: "normal" },
    { path: "./fonts/GT-Super-Text-Bold-Italic-Trial.otf", weight: "700", style: "italic" },
  ],
  variable: "--font-gt-super-text",
  display: "swap",
});

/* ─── Inter (UI Labels) ─── */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/* ─── Metadata ─── */
export const metadata: Metadata = {
  title: {
    default: "Brutal Fruit Tanzania - Gallery",
    template: "%s | Brutal Fruit Tanzania",
  },
  description:
    "Browse and download photos from Brutal Fruit events. Experience the sparkle of sophisticated refreshment.",
  metadataBase: new URL("https://brutalfruit.co.tz"),
  openGraph: {
    title: "Brutal Fruit Tanzania - Gallery",
    description: "Browse and download photos from Brutal Fruit events.",
    url: "https://brutalfruit.co.tz",
    siteName: "Brutal Fruit Tanzania",
    type: "website",
  },
};

/* ─── Root Layout ─── */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${gtSuperDisplay.variable} ${gtSuperText.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
