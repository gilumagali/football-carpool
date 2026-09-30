import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "Football Carpool",
  description: "Simple parent driving coordination for football practice",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={heebo.variable}>
      <body>{children}</body>
    </html>
  );
}
