import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xiphias",
  description: "Aggregated range prediction markets for Crypto and Politics",
  icons: {
    icon: "/logo/xiphiaslogo.png",
  },
};

import { Web3Providers } from "@/components/Web3Providers";
import { RailgunEngineProvider } from "@/hooks/useRailgunEngine";
import { RailgunWalletProvider } from "@/hooks/useRailgunWallet";
import { RailgunProvider } from "@/contexts/RailgunContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${interTight.variable} ${jetbrains.variable} font-sans antialiased bg-[#FFFFFF] text-[#111827]`}
      >
        <Web3Providers>
          <RailgunEngineProvider>
            <RailgunWalletProvider>
              <RailgunProvider>
                {children}
              </RailgunProvider>
            </RailgunWalletProvider>
          </RailgunEngineProvider>
        </Web3Providers>
      </body>
    </html>
  );
}
