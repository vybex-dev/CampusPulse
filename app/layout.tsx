import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "CampusPulse", template: "%s · CampusPulse" },
  description:
    "See, understand, act, prove: a closed loop for campus sustainability. Demo data is simulated.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
