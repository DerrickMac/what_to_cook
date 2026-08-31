import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "What To Cook",
  description: "Pick what's in your kitchen and get a recipe idea in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream text-char min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
