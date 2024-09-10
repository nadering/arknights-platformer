import type { Metadata } from "next";
import { RatioSetter } from "@common";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arknights-Fangame",
  description: "Arknights-Platformer-Fangame",
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
