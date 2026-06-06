import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppAccessGate } from "@/components/auth/AppAccessGate";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Tabletop Sheet Roller",
  description: "Local character sheet viewer and dice roller for D&D 5e and NWoD."
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppAccessGate>{children}</AppAccessGate>
      </body>
    </html>
  );
}
