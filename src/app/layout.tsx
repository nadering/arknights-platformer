import type { Metadata, Viewport } from "next";
import { RatioSetter } from "@common";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arknights-Fangame",
  description: "Arknights-Platformer-Fangame",
};

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RatioSetter>{children}</RatioSetter>
      </body>
    </html>
  );
}
