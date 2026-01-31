"use client";

import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import {
    getDefaultConfig,
    RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
} from "wagmi/chains";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";

const config = getDefaultConfig({
    appName: "HackMoney26",
    projectId: "YOUR_PROJECT_ID", // TODO: User should provide their own Project ID from WalletConnect Cloud
    chains: [mainnet, polygon, optimism, arbitrum, base],
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
