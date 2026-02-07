"use client";

import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
<<<<<<< HEAD
import { chains } from "@/lib/networkConfig";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { YellowProvider } from "../app/yellow-ultimate/YellowEngine";

const config = getDefaultConfig({
  appName: "HackMoney26",
  projectId: "YOUR_PROJECT_ID", // TODO: User should provide their own Project ID from WalletConnect Cloud
  chains: chains,
  ssr: true,
=======
import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia
} from "wagmi/chains";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import { YellowProvider } from "../app/yellow-ultimate/YellowEngine";

const config = getDefaultConfig({
    appName: "HackMoney26",
    projectId: "YOUR_PROJECT_ID", // TODO: User should provide their own Project ID from WalletConnect Cloud
    chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
    ssr: true,
>>>>>>> 4a23273 (integrate yellow session key and state channels)
});

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: React.ReactNode }) {
<<<<<<< HEAD
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <YellowProvider>{children}</YellowProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
=======
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <YellowProvider>
                        {children}
                    </YellowProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
>>>>>>> 4a23273 (integrate yellow session key and state channels)
}
