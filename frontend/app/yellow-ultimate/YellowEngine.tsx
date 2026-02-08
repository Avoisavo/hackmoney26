"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  createAuthRequestMessage,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createTransferMessage,
  createCloseChannelMessage,
  createECDSAMessageSigner,
  NitroliteClient,
  WalletStateSigner,
} from "@erc7824/nitrolite";
import { ethers } from "ethers";
import { createPublicClient, http, createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";

// --- Config ---
const YELLOW_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";
const CUSTODY_ADDRESS = "0x019B65A265EB3363822f2752141b3dF16131b262" as const;
const YTEST_USD_TOKEN = "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb" as const;

interface YellowContextType {
  connected: boolean;
  authenticated: boolean;
  connecting: boolean;
  channelStatus: "none" | "opening" | "open" | "funding" | "funded" | "closing" | "closed";
  session: any;
  ledgerBalances: Record<string, string>;
  vaultBalance: string;
  custodyBalance: string;
  lastTxHash: string | null;
  isAutoInitializating: boolean;
  connect: () => Promise<void>;
  ensureActiveSession: () => Promise<boolean>;
  requestFaucet: () => Promise<void>;
  deposit: (amount: string) => Promise<void>;
  anchor: () => Promise<void>;
  buyShares: (amount: string, cost: string) => Promise<void>;
  trade: (amount: string) => Promise<void>;
  cashout: () => Promise<void>;
  withdraw: (amount: string) => Promise<void>;
  messages: any[];
  withdrawableItems: any[];
}

const YellowContext = createContext<YellowContextType | undefined>(undefined);

export function YellowProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Internal state
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [channelStatus, setChannelStatus] = useState<
    "none" | "opening" | "open" | "funding" | "funded" | "closing" | "closed"
  >("none");
  const [session, setSession] = useState<any>({
    id: null,
    version: 0,
    allocations: [],
  });
  const [ledgerBalances, setLedgerBalances] = useState<Record<string, string>>(
    {},
  );
  const [vaultBalance, setVaultBalance] = useState<string>("0.00");
  const [custodyBalance, setCustodyBalance] = useState<string>("0.00");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [isAutoInitializating, setIsAutoInitializating] = useState(false);
  const [supportedAssets, setSupportedAssets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [withdrawableItems, setWithdrawableItems] = useState<any[]>([]);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef(0);
  const nitroClientRef = useRef<NitroliteClient | null>(null);
  const publicClientRef = useRef<any>(null);
  const sessionKeyRef = useRef<any>(null);
  const pendingAuthRef = useRef<any>(null);
  const supportedAssetsRef = useRef<any[]>([]);
  const sessionRef = useRef<any>({ id: null, version: 0, allocations: [] });

  const addMessage = useCallback((type: string, content: string) => {
    setMessages((prev: any[]) =>
      [{ type, content, timestamp: new Date() }, ...prev].slice(0, 100),
    );
  }, []);

  const sendMessage = useCallback(
    (req: any) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        addMessage("error", "Socket not open");
        return;
      }
      const msgStr = JSON.stringify(req);
      addMessage("sent", msgStr);
      wsRef.current.send(msgStr);
    },
    [addMessage],
  );

  // Update state and ref together
  const updateSession = useCallback((updates: Partial<any>) => {
    setSession((prev: any) => {
      const next = { ...prev, ...updates };
      sessionRef.current = next;
      return next;
    });
  }, []);

  // Helper to format amount for Nitro (BigInt)
  const toBigInt = useCallback((amount: any, decimals: number = 6) => {
    if (!amount || amount === "0") return BigInt(0);
    try {
      return ethers.parseUnits(amount.toString(), decimals);
    } catch (e) {
      return BigInt(Math.floor(parseFloat(amount) || 0));
    }
  }, []);

  // RPC Handler
  const handleMessage = useCallback(
    async (msg: any) => {
      addMessage("received", JSON.stringify(msg));

      const res = msg.res;
      let method = "";
      let data: any = null;

      if (Array.isArray(res)) {
        [, method, data] = res;
      } else {
        method = msg.method || msg.type || "";
        data = msg.params || msg.result || msg;
      }

      // Auto-handle errors
      if (method === "error" || (data && data.error)) {
        const err = data?.error || JSON.stringify(data);
        addMessage("error", `Node Error: ${err}`);
        return;
      }

      switch (method) {
        case "challenge":
        case "auth_challenge":
          const challenge =
            data.challenge_message || data.challengeMessage || data;
          if (challenge && typeof challenge === "string") {
            addMessage(
              "info",
              `🔐 Challenge received: ${challenge.slice(0, 8)}...`,
            );
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();

            const domain = { name: pendingAuthRef.current.application };
            const types = {
              Policy: [
                { name: "challenge", type: "string" },
                { name: "scope", type: "string" },
                { name: "wallet", type: "address" },
                { name: "session_key", type: "address" },
                { name: "expires_at", type: "uint64" },
                { name: "allowances", type: "Allowance[]" },
              ],
              Allowance: [
                { name: "asset", type: "string" },
                { name: "amount", type: "string" },
              ],
            };
            const authMsg = {
              challenge: challenge,
              scope: pendingAuthRef.current.scope,
              wallet: pendingAuthRef.current.address,
              session_key: pendingAuthRef.current.session_key,
              expires_at: pendingAuthRef.current.expires_at,
              allowances: pendingAuthRef.current.allowances,
            };

            const signature = await signer.signTypedData(
              domain,
              types,
              authMsg,
            );
            sendMessage({
              req: [
                ++messageIdRef.current,
                "auth_verify",
                { challenge },
                Date.now(),
              ],
              sig: [signature],
            });
          }
          break;

        case "auth_verify":
        case "result":
          if (data && (data.jwt_token || data.jwtToken)) {
            setAuthenticated(true);
            setConnecting(false);
            addMessage("info", "✅ Authenticated");
            // Sync channels and balances immediately
            sendMessage({
              req: [++messageIdRef.current, "get_channels", {}, Date.now()],
            });
          }
          break;

        case "cu":
          if (data.status === "open") {
            const amount = parseFloat(data.amount || "0");
            setChannelStatus(amount > 0 ? "funded" : "open");
            addMessage(
              "info",
              `Channel ${data.channel_id.slice(0, 8)} is ${amount > 0 ? "FUNDED" : "OPEN"}`,
            );
            updateSession({
              id: data.channel_id,
              version: data.version ?? sessionRef.current.version,
              allocations: data.allocations ?? sessionRef.current.allocations,
            });

            // If it's open but with 0 amount, try to fund it now (once node acknowledges it's open)
            if (amount === 0 && authenticated && sessionKeyRef.current) {
              addMessage("info", "🚀 Channel open confirmed. Initiating funding...");
              const sessionSigner = createECDSAMessageSigner(
                sessionKeyRef.current.privateKey,
              );
              createResizeChannelMessage(sessionSigner as any, {
                channel_id: data.channel_id as `0x${string}`,
                allocate_amount: toBigInt("100", 6),
                funds_destination: address as `0x${string}`,
                resize_amount: BigInt(0) as any,
              }).then((resizeMsg) => {
                sendMessage(JSON.parse(resizeMsg));
              });
            }
          } else if (data.status === "closed") {
            setChannelStatus("none");
            addMessage("info", "Channel closed");
            updateSession({ id: null, version: 0, allocations: [] });
          }
          break;

        case "create_channel":
          if (data && data.channel_id) {
            addMessage("info", "✓ Channel ID assigned by Yellow node");
            updateSession({ id: data.channel_id });

            if (nitroClientRef.current) {
              const { channel, state, server_signature } = data;
              const unsignedInitialState = {
                intent: state.intent,
                version: BigInt(state.version),
                data: state.state_data || state.data || "0x",
                allocations: state.allocations.map((a: any) => ({
                  destination: a.destination,
                  token: a.token,
                  amount: toBigInt(a.amount),
                })),
              };

              (async () => {
                try {
                  addMessage("info", "📡 Anchoring channel on Sepolia...");
                  const result = await nitroClientRef.current!.createChannel({
                    channel,
                    unsignedInitialState,
                    serverSignature: server_signature,
                  });

                  const txHash = typeof result === "string" ? result : (result as any).txHash || (result as any).hash;
                  setLastTxHash(txHash);
                  addMessage("info", `✅ Anchor TX submitted: ${txHash.slice(0, 10)}...`);

                  if (publicClientRef.current) {
                    addMessage("info", "⏳ Waiting for on-chain confirmation...");
                    await publicClientRef.current.waitForTransactionReceipt({
                      hash: txHash as `0x${string}`,
                      confirmations: 1,
                    });
                    addMessage("info", "✓ Channel anchored successfully!");
                  }
                  setChannelStatus("open");
                } catch (e: any) {
                  addMessage("error", `Anchor failed: ${e.message}`);
                  setChannelStatus("none");
                }
              })();
            }
          }
          break;

        case "resize_channel":
          if (data && data.channel_id) {
            addMessage("info", "✓ Resize response received from node");
          }
          if (data && nitroClientRef.current) {
            const { channel_id, state, server_signature } = data;
            const resizeState = {
              intent: state.intent,
              version: BigInt(state.version),
              data: state.state_data || state.data || "0x",
              allocations: state.allocations.map((a: any) => ({
                destination:
                  a.destination || a.destination_account || a.participant,
                token: a.token || a.asset,
                amount: toBigInt(a.amount),
              })),
              channelId: channel_id,
              serverSignature: server_signature,
            };

            (async () => {
              try {
                addMessage("info", "📡 Submitting funding to blockchain...");
                // Fetch proof states like hackmoney
                let proofStates: any[] = [];
                try {
                  const onChainData = await nitroClientRef.current!.getChannelData(channel_id as `0x${string}`);
                  if ((onChainData as any).lastValidState) {
                    proofStates = [(onChainData as any).lastValidState];
                  }
                } catch (e) {}

                const result = await nitroClientRef.current!.resizeChannel({
                  resizeState,
                  proofStates,
                });

                const txHash = typeof result === "string" ? result : (result as any).txHash || (result as any).hash;
                setLastTxHash(txHash);
                addMessage("info", `✅ Funding TX submitted: ${txHash.slice(0, 10)}...`);

                if (publicClientRef.current) {
                   await publicClientRef.current.waitForTransactionReceipt({
                    hash: txHash as `0x${string}`,
                    confirmations: 1,
                  });
                  addMessage("info", "✓ Funding confirmed on-chain!");
                }
                setChannelStatus("funded");
              } catch (e: any) {
                addMessage("error", `Funding failed: ${e.message}`);
              }
            })();
          }
          break;

        case "channels":
          if (
            data &&
            Array.isArray(data.channels) &&
            data.channels.length > 0
          ) {
            const activeChan = data.channels[0];
            addMessage(
              "info",
              `Found existing channel: ${activeChan.channel_id.slice(0, 8)}`,
            );
            setChannelStatus(
              activeChan.amount && parseFloat(activeChan.amount) > 0
                ? "funded"
                : "open",
            );
            updateSession({
              id: activeChan.channel_id,
              version: activeChan.version || 0,
              allocations: activeChan.allocations || [],
            });
          }
          break;

        case "ledger_balances":
        case "balances": {
          const balances = data.balances || data;
          if (Array.isArray(balances)) {
            const newBals: Record<string, string> = { ...ledgerBalances };
            balances.forEach((b: any) => {
              newBals[b.asset] = b.amount;
              newBals[b.asset.toLowerCase()] = b.amount;
            });
            setLedgerBalances(newBals);
          }
          break;
        }

        case "assets":
          if (data && data.assets) {
            setSupportedAssets(data.assets);
            supportedAssetsRef.current = data.assets;
            addMessage(
              "info",
              `✅ Assets Sync: ${data.assets.length} supported`,
            );
          }
          break;

        case "bu": // Balance Update
          if (data && data.balance_updates) {
            const bus = data.balance_updates;
            const newBals: Record<string, string> = { ...ledgerBalances };
            bus.forEach((b: any) => {
              const key = b.symbol || b.asset;
              newBals[key] = b.amount;
              newBals[key.toLowerCase()] = b.amount;
            });
            setLedgerBalances(newBals);
            addMessage(
              "info",
              `💰 Balance updated: ${bus.map((b: any) => `${b.amount} ${b.symbol || b.asset}`).join(", ")}`,
            );
          }
          break;

        case "app_session_created":
        case "app_state_submitted":
        case "tr":
        case "transfer":
          if (data) {
            addMessage(
              "info",
              `✅ Activity Confirmed: v${data.version || "?"}`,
            );
            updateSession({
              id:
                data.app_session_id || data.channel_id || sessionRef.current.id,
              version: data.version ?? sessionRef.current.version,
              allocations: data.allocations ?? sessionRef.current.allocations,
            });
          }
          break;

        case "close_channel":
          if (data && data.state && nitroClientRef.current) {
            const { channel_id, state, server_signature } = data;
            addMessage("info", `✓ Settlement signature obtained from node`);
            setChannelStatus("closing");

            const finalState = {
              intent: state.intent,
              version: BigInt(state.version),
              data: state.state_data || state.data || "0x",
              allocations: state.allocations.map((a: any) => ({
                destination: a.destination || a.participant || a.destination_account,
                token: a.token || a.asset,
                amount: toBigInt(a.amount),
              })),
              channelId: channel_id,
              serverSignature: server_signature,
            };

            (async () => {
              try {
                addMessage("info", "📡 Submitting settlement to blockchain...");
                const result = await nitroClientRef.current!.closeChannel({
                  finalState,
                  stateData: state.state_data || state.data || "0x",
                });

                const txHash = typeof result === "string" ? result : (result as any).txHash || (result as any).hash;
                setLastTxHash(txHash);
                addMessage("info", `✅ Settlement TX submitted: ${txHash.slice(0, 10)}...`);

                if (publicClientRef.current) {
                  await publicClientRef.current.waitForTransactionReceipt({
                    hash: txHash as `0x${string}`,
                    confirmations: 1,
                  });
                  addMessage("info", "✓ Settlement confirmed! Channel closed.");
                }
                setChannelStatus("closed");
                updateSession({ id: null, version: 0, allocations: [] });
              } catch (e: any) {
                addMessage("error", `Settlement failed: ${e.message}`);
                setChannelStatus("funded");
              }
            })();
          }
          break;
      }
    },
    [addMessage, sendMessage, updateSession, ledgerBalances, toBigInt],
  );

  // Actions
  const connect = useCallback(async () => {
    if (!address) return;
    setConnecting(true);
    addMessage("info", "Connecting to ClearNode...");

    const ws = new WebSocket(YELLOW_WS_URL);
    wsRef.current = ws;

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: "ping" }));
      }
    }, 20000);

    ws.onopen = async () => {
      setConnected(true);
      const sk = ethers.Wallet.createRandom();
      sessionKeyRef.current = sk;
      const expires_at = Math.floor(Date.now() / 1000) + 3600;
      const authParams = {
        address: address,
        session_key: sk.address,
        application: "xiphias-markets",
        allowances: [{ asset: "ytest.usd", amount: "1000" }],
        expires_at: expires_at,
        scope: "console",
      };
      pendingAuthRef.current = authParams;
      sendMessage({
        req: [++messageIdRef.current, "auth_request", authParams, Date.now()],
      });
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        handleMessage(raw);
      } catch (e) {
        console.error("WS Parse Error:", e);
        addMessage("error", "Failed to parse node message");
      }
    };

    ws.onclose = () => {
      clearInterval(pingInterval);
      setConnected(false);
      setAuthenticated(false);
      setChannelStatus("none");
      addMessage("info", "WebSocket closed. Please refresh or reconnect.");
    };
  }, [address, handleMessage, sendMessage]);

  const refreshVaultBalance = useCallback(async () => {
    if (!nitroClientRef.current || !address) return;
    try {
      const assetInfo = supportedAssetsRef.current.find(
        (a) => a.symbol === "ytest.usd" || a.asset === "ytest.usd",
      );
      const tokenAddress = assetInfo
        ? assetInfo.token || assetInfo.address
        : "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
      const bal = await nitroClientRef.current.getAccountBalance(
        tokenAddress as `0x${string}`,
      );
      setVaultBalance(ethers.formatUnits(bal, 6));
    } catch (e) {
      console.error("Failed to fetch vault balance", e);
    }
  }, [address]);

  // Request sandbox faucet tokens
  const requestFaucet = useCallback(async () => {
    if (!address) return;
    addMessage("info", "Requesting sandbox ytest.usd from faucet...");
    try {
      const response = await fetch(
        "https://clearnet-sandbox.yellow.com/faucet/requestTokens",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress: address }),
        }
      );
      if (response.ok) {
        addMessage("info", "✅ Faucet tokens credited to your Unified Balance!");
        // Trigger balance refresh
        sendMessage({
          req: [++messageIdRef.current, "get_ledger_balances", { account: address }, Date.now()],
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        addMessage("error", `Faucet request failed: ${errData.message || response.statusText}`);
      }
    } catch (e: any) {
      addMessage("error", `Faucet error: ${e.message}`);
    }
  }, [address, addMessage, sendMessage]);

  // Refresh custody contract balance (for withdrawable amounts)
  const refreshCustodyBalance = useCallback(async () => {
    if (!publicClientRef.current || !address) return;
    try {
      const result = await publicClientRef.current.readContract({
        address: CUSTODY_ADDRESS,
        abi: [{
          type: 'function',
          name: 'getAccountsBalances',
          inputs: [
            { name: 'users', type: 'address[]' },
            { name: 'tokens', type: 'address[]' }
          ],
          outputs: [{ type: 'uint256[]' }],
          stateMutability: 'view'
        }] as const,
        functionName: 'getAccountsBalances',
        args: [[address as `0x${string}`], [YTEST_USD_TOKEN]],
      }) as bigint[];
      const balance = result[0] ?? BigInt(0);
      setCustodyBalance(ethers.formatUnits(balance, 6));
      addMessage("info", `💰 Custody balance: ${ethers.formatUnits(balance, 6)} yUSD`);
    } catch (e) {
      console.error("Failed to fetch custody balance", e);
    }
  }, [address, addMessage]);

  const deposit = useCallback(
    async (amount: string) => {
      if (!nitroClientRef.current || !address) return;

      const assetInfo = supportedAssetsRef.current.find(
        (a) => a.symbol === "ytest.usd" || a.asset === "ytest.usd",
      );
      const tokenAddress = assetInfo
        ? assetInfo.token || assetInfo.address
        : "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
      const decimals = assetInfo ? assetInfo.decimals : 6;

      addMessage("info", `Deposit initiated for ${amount} yUSD...`);
      try {
        const tx = await nitroClientRef.current.deposit(
          tokenAddress as `0x${string}`,
          toBigInt(amount, decimals),
        );
        addMessage("info", `✅ Deposit Tx: ${tx}`);
        setTimeout(refreshVaultBalance, 5000);
      } catch (e: any) {
        addMessage("error", `Deposit failed: ${e.message}`);
      }
    },
    [address, addMessage, toBigInt, refreshVaultBalance],
  );

  const anchor = useCallback(async () => {
    if (!wsRef.current || !authenticated || !address) {
      addMessage("error", "Auth required for anchoring");
      return;
    }
    setChannelStatus("opening");
    addMessage("info", "Initiating channel anchor...");

    try {
      const sessionSigner = createECDSAMessageSigner(
        sessionKeyRef.current.privateKey,
      );
      const assetInfo = supportedAssetsRef.current.find(
        (a) => a.symbol === "ytest.usd" || a.asset === "ytest.usd",
      );
      const tokenAddress = assetInfo
        ? assetInfo.token || assetInfo.address
        : "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
      const chainId = assetInfo
        ? Number(assetInfo.chain_id || assetInfo.chainId)
        : 11155111;

      const createMsg = await createCreateChannelMessage(sessionSigner as any, {
        chain_id: chainId,
        token: tokenAddress as `0x${string}`,
      });

      sendMessage(JSON.parse(createMsg));


    } catch (e: any) {
      addMessage("error", `Anchor failed: ${e.message}`);
      setChannelStatus("none");
    }
  }, [address, authenticated, sendMessage, addMessage, toBigInt]);

  const ensureActiveSession = useCallback(async () => {
    if (
      authenticated &&
      (channelStatus === "open" || channelStatus === "funded")
    )
      return true;

    setIsAutoInitializating(true);
    addMessage("info", "⛓️ Auto-initializing Yellow Session...");

    try {
      if (!connected) {
        await connect();
        // Wait for auth to complete (handleMessage sets authenticated)
        let attempts = 0;
        while (!authenticated && attempts < 20) {
          await new Promise((r) => setTimeout(r, 500));
          attempts++;
        }
      }

      if (authenticated && channelStatus === "none") {
        await anchor();
        // Wait for channel to open (transitions: none -> opening -> open)
        let attempts = 0;
        while ((channelStatus === "none" || channelStatus === "opening") && attempts < 60) {
          await new Promise((r) => setTimeout(r, 1000));
          attempts++;
        }
      }

      return (
        authenticated &&
        (channelStatus === "open" || channelStatus === "funded")
      );
    } catch (e) {
      addMessage("error", "Auto-init failed");
      return false;
    } finally {
      setIsAutoInitializating(false);
    }
  }, [authenticated, channelStatus, connected, connect, anchor, addMessage]);

  const buyShares = useCallback(
    async (amount: string, cost: string) => {
      const currentId = sessionRef.current.id;
      if (
        !wsRef.current ||
        !authenticated ||
        !currentId ||
        !address ||
        !sessionKeyRef.current
      ) {
        const ok = await ensureActiveSession();
        if (!ok) return;
      }

      addMessage(
        "info",
        `🛒 Executing Atomic Swap: ${cost} yUSD for ${amount} YES-shares`,
      );
      try {
        const sessionSigner = createECDSAMessageSigner(
          sessionKeyRef.current.privateKey,
        );
        const tokenAddress = "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
        const recipient = "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC"; // AMM Address

        const transferMsg = await createTransferMessage(sessionSigner as any, {
          destination: recipient as `0x${string}`,
          allocations: [
            {
              asset: tokenAddress,
              amount: toBigInt(cost, 6).toString(),
            },
          ],
        });

        sendMessage(JSON.parse(transferMsg));

        // Simulation: Node confirms and sends shares back instantly
        setTimeout(() => {
          const mockBu = {
            type: "bu",
            balance_updates: [
              {
                asset: "YES-shares",
                amount: amount,
                symbol: "YES",
              },
              {
                asset: "ytest.usd",
                amount: (
                  parseFloat(ledgerBalances["ytest.usd"] || "0") -
                  parseFloat(cost)
                ).toString(),
                symbol: "yUSD",
              },
            ],
          };
          handleMessage(mockBu);
        }, 500);
      } catch (e: any) {
        addMessage("error", `Atomic Swap failed: ${e.message}`);
      }
    },
    [
      address,
      authenticated,
      sendMessage,
      addMessage,
      ensureActiveSession,
      ledgerBalances,
      handleMessage,
    ],
  );

  const trade = useCallback(
    async (amount: string) => {
      const currentId = sessionRef.current.id;
      if (
        !wsRef.current ||
        !authenticated ||
        !currentId ||
        !address ||
        !sessionKeyRef.current
      ) {
        addMessage(
          "error",
          `Trade blocked: No active session or not authenticated`,
        );
        return;
      }

      addMessage("info", `Executing off-chain transfer: ${amount} yUSD`);
      try {
        const sessionSigner = createECDSAMessageSigner(
          sessionKeyRef.current.privateKey,
        );

        const tokenAddress = "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
        const recipient = "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC";

        const transferMsg = await createTransferMessage(sessionSigner as any, {
          destination: recipient as `0x${string}`,
          allocations: [
            {
              asset: tokenAddress,
              amount: toBigInt(amount, 6).toString(),
            },
          ],
        });

        sendMessage(JSON.parse(transferMsg));
      } catch (e: any) {
        addMessage("error", `Transfer failed: ${e.message}`);
      }
    },
    [address, authenticated, sendMessage, addMessage],
  );

  const cashout = useCallback(async () => {
    const currentId = sessionRef.current.id;
    if (!wsRef.current || !authenticated || !currentId || !address) {
      addMessage("error", `Cashout blocked: No active session ID`);
      return;
    }

    // Check channel is in a valid state for closing
    if (channelStatus !== "open" && channelStatus !== "funded") {
      addMessage("error", `Cannot close channel in "${channelStatus}" state. Wait for channel to be confirmed.`);
      return;
    }

    addMessage(
      "info",
      `Requesting settlement for session ${currentId.slice(0, 8)}`,
    );
    try {
      const sessionSigner = createECDSAMessageSigner(
        sessionKeyRef.current.privateKey,
      );
      const req: any = {
        req: [
          ++messageIdRef.current,
          "close_channel",
          {
            channel_id: currentId as `0x${string}`,
            funds_destination: address as `0x${string}`,
          },
          Date.now(),
        ],
      };

      const signature = await (sessionSigner as any)(req.req);
      req.sig = [signature];
      sendMessage(req);
    } catch (e: any) {
      addMessage("error", `Cashout request failed: ${e.message}`);
    }
  }, [authenticated, address, sendMessage, addMessage, channelStatus]);

  const withdraw = useCallback(
    async (amount: string) => {
      if (!nitroClientRef.current || !publicClientRef.current || !address) {
        addMessage("error", "NitroliteClient not initialized");
        return;
      }

      addMessage("info", `Checking on-chain custody balance for withdrawal...`);

      try {
        // Poll custody contract for withdrawable balance (like hackmoney does)
        let withdrawableBalance = BigInt(0);
        let retries = 0;
        const maxRetries = 10;

        while (retries < maxRetries) {
          const result = await publicClientRef.current.readContract({
            address: CUSTODY_ADDRESS,
            abi: [{
              type: 'function',
              name: 'getAccountsBalances',
              inputs: [
                { name: 'users', type: 'address[]' },
                { name: 'tokens', type: 'address[]' }
              ],
              outputs: [{ type: 'uint256[]' }],
              stateMutability: 'view'
            }] as const,
            functionName: 'getAccountsBalances',
            args: [[address as `0x${string}`], [YTEST_USD_TOKEN]],
          }) as bigint[];

          withdrawableBalance = result[0] ?? BigInt(0);
          addMessage("info", `Custody balance: ${ethers.formatUnits(withdrawableBalance, 6)} yUSD (attempt ${retries + 1}/${maxRetries})`);

          if (withdrawableBalance > BigInt(0)) {
            break;
          }

          // Wait and retry
          addMessage("info", "⏳ Waiting for close TX to settle on chain...");
          await new Promise(r => setTimeout(r, 3000));
          retries++;
        }

        if (withdrawableBalance > BigInt(0)) {
          addMessage("info", `Withdrawing ${ethers.formatUnits(withdrawableBalance, 6)} yUSD to wallet...`);
          
          const withdrawalTx = await nitroClientRef.current.withdrawal(
            YTEST_USD_TOKEN,
            withdrawableBalance
          );
          
          const txHashStr = typeof withdrawalTx === 'string' ? withdrawalTx : (withdrawalTx as any)?.txHash || (withdrawalTx as any)?.hash || String(withdrawalTx);
          setLastTxHash(txHashStr);
          addMessage("info", `✅ Funds withdrawn! TX: ${txHashStr.slice(0, 12)}...`);
          
          // Reset channel state
          setChannelStatus("none");
          updateSession({ id: null, version: 0, allocations: [] });
          setCustodyBalance("0.00");
        } else {
          addMessage("error", "No funds available yet. The close TX may still be pending.");
        }
      } catch (e: any) {
        addMessage("error", `Withdraw failed: ${e.message}`);
      }
    },
    [address, addMessage, updateSession],
  );

  // Initialization: Nitrolite Client
  useEffect(() => {
    if (isConnected && address && walletClient) {
      const pc = createPublicClient({
        chain: sepolia,
        transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
      });
      const wc = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum as any),
        account: address as `0x${string}`,
      });

      nitroClientRef.current = new NitroliteClient({
        publicClient: pc as any,
        walletClient: wc as any,
        stateSigner: new WalletStateSigner(wc as any),
        addresses: {
          custody: "0x019B65A265EB3363822f2752141b3dF16131b262",
          adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",
          tokenAddress: "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
        } as any,
        chainId: 11155111,
        challengeDuration: BigInt(3600),
      });
      publicClientRef.current = pc;
      addMessage("info", "🛠 Nitrolite Client initialized");
    }
  }, [isConnected, address, walletClient, addMessage]);

  return (
    <YellowContext.Provider
      value={{
        connected,
        authenticated,
        connecting,
        channelStatus,
        session,
        ledgerBalances,
        vaultBalance,
        custodyBalance,
        lastTxHash,
        isAutoInitializating,
        connect,
        ensureActiveSession,
        requestFaucet,
        deposit,
        anchor,
        buyShares,
        trade,
        cashout,
        withdraw,
        messages,
        withdrawableItems,
      }}
    >
      {children}
    </YellowContext.Provider>
  );
}

export function useYellow() {
  const context = useContext(YellowContext);
  if (!context) throw new Error("useYellow must be used within YellowProvider");
  return context;
}

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  createAuthRequestMessage,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createTransferMessage,
  createCloseChannelMessage,
  createECDSAMessageSigner,
  NitroliteClient,
  WalletStateSigner,
} from "@erc7824/nitrolite";
import { ethers } from "ethers";
import { createPublicClient, http, createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";

// --- Config ---
const YELLOW_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";
const CUSTODY_ADDRESS = "0x019B65A265EB3363822f2752141b3dF16131b262" as const;
const YTEST_USD_TOKEN = "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb" as const;

interface YellowContextType {
  connected: boolean;
  authenticated: boolean;
  connecting: boolean;
  channelStatus: "none" | "opening" | "open" | "funding" | "funded" | "closing" | "closed";
  session: any;
  ledgerBalances: Record<string, string>;
  vaultBalance: string;
  custodyBalance: string;
  lastTxHash: string | null;
  isAutoInitializating: boolean;
  connect: () => Promise<void>;
  ensureActiveSession: () => Promise<boolean>;
  requestFaucet: () => Promise<void>;
  deposit: (amount: string) => Promise<void>;
  anchor: () => Promise<void>;
  buyShares: (amount: string, cost: string) => Promise<void>;
  trade: (amount: string) => Promise<void>;
  cashout: () => Promise<void>;
  withdraw: (amount: string) => Promise<void>;
  messages: any[];
  withdrawableItems: any[];
}

const YellowContext = createContext<YellowContextType | undefined>(undefined);

export function YellowProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Internal state
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [channelStatus, setChannelStatus] = useState<
    "none" | "opening" | "open" | "funding" | "funded" | "closing" | "closed"
  >("none");
  const [session, setSession] = useState<any>({
    id: null,
    version: 0,
    allocations: [],
  });
  const [ledgerBalances, setLedgerBalances] = useState<Record<string, string>>(
    {},
  );
  const [vaultBalance, setVaultBalance] = useState<string>("0.00");
  const [custodyBalance, setCustodyBalance] = useState<string>("0.00");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [isAutoInitializating, setIsAutoInitializating] = useState(false);
  const [supportedAssets, setSupportedAssets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [withdrawableItems, setWithdrawableItems] = useState<any[]>([]);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef(0);
  const nitroClientRef = useRef<NitroliteClient | null>(null);
  const publicClientRef = useRef<any>(null);
  const sessionKeyRef = useRef<any>(null);
  const pendingAuthRef = useRef<any>(null);
  const supportedAssetsRef = useRef<any[]>([]);
  const sessionRef = useRef<any>({ id: null, version: 0, allocations: [] });

  const addMessage = useCallback((type: string, content: string) => {
    setMessages((prev: any[]) =>
      [{ type, content, timestamp: new Date() }, ...prev].slice(0, 100),
    );
  }, []);

  const sendMessage = useCallback(
    (req: any) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        addMessage("error", "Socket not open");
        return;
      }
      const msgStr = JSON.stringify(req);
      addMessage("sent", msgStr);
      wsRef.current.send(msgStr);
    },
    [addMessage],
  );

  // Update state and ref together
  const updateSession = useCallback((updates: Partial<any>) => {
    setSession((prev: any) => {
      const next = { ...prev, ...updates };
      sessionRef.current = next;
      return next;
    });
  }, []);

  // Helper to format amount for Nitro (BigInt)
  const toBigInt = useCallback((amount: any, decimals: number = 6) => {
    if (!amount || amount === "0") return BigInt(0);
    try {
      return ethers.parseUnits(amount.toString(), decimals);
    } catch (e) {
      return BigInt(Math.floor(parseFloat(amount) || 0));
    }
  }, []);

  // RPC Handler
  const handleMessage = useCallback(
    async (msg: any) => {
      addMessage("received", JSON.stringify(msg));

      const res = msg.res;
      let method = "";
      let data: any = null;

      if (Array.isArray(res)) {
        [, method, data] = res;
      } else {
        method = msg.method || msg.type || "";
        data = msg.params || msg.result || msg;
      }

      // Auto-handle errors
      if (method === "error" || (data && data.error)) {
        const err = data?.error || JSON.stringify(data);
        addMessage("error", `Node Error: ${err}`);
        return;
      }

      switch (method) {
        case "challenge":
        case "auth_challenge":
          const challenge =
            data.challenge_message || data.challengeMessage || data;
          if (challenge && typeof challenge === "string") {
            addMessage(
              "info",
              `🔐 Challenge received: ${challenge.slice(0, 8)}...`,
            );
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();

            const domain = { name: pendingAuthRef.current.application };
            const types = {
              Policy: [
                { name: "challenge", type: "string" },
                { name: "scope", type: "string" },
                { name: "wallet", type: "address" },
                { name: "session_key", type: "address" },
                { name: "expires_at", type: "uint64" },
                { name: "allowances", type: "Allowance[]" },
              ],
              Allowance: [
                { name: "asset", type: "string" },
                { name: "amount", type: "string" },
              ],
            };
            const authMsg = {
              challenge: challenge,
              scope: pendingAuthRef.current.scope,
              wallet: pendingAuthRef.current.address,
              session_key: pendingAuthRef.current.session_key,
              expires_at: pendingAuthRef.current.expires_at,
              allowances: pendingAuthRef.current.allowances,
            };

            const signature = await signer.signTypedData(
              domain,
              types,
              authMsg,
            );
            sendMessage({
              req: [
                ++messageIdRef.current,
                "auth_verify",
                { challenge },
                Date.now(),
              ],
              sig: [signature],
            });
          }
          break;

        case "auth_verify":
        case "result":
          if (data && (data.jwt_token || data.jwtToken)) {
            setAuthenticated(true);
            setConnecting(false);
            addMessage("info", "✅ Authenticated");
            // Sync channels and balances immediately
            sendMessage({
              req: [++messageIdRef.current, "get_channels", {}, Date.now()],
            });
          }
          break;

        case "cu":
          if (data.status === "open") {
            const amount = parseFloat(data.amount || "0");
            setChannelStatus(amount > 0 ? "funded" : "open");
            addMessage(
              "info",
              `Channel ${data.channel_id.slice(0, 8)} is ${amount > 0 ? "FUNDED" : "OPEN"}`,
            );
            updateSession({
              id: data.channel_id,
              version: data.version ?? sessionRef.current.version,
              allocations: data.allocations ?? sessionRef.current.allocations,
            });

            // If it's open but with 0 amount, try to fund it now (once node acknowledges it's open)
            if (amount === 0 && authenticated && sessionKeyRef.current) {
              addMessage("info", "🚀 Channel open confirmed. Initiating funding...");
              const sessionSigner = createECDSAMessageSigner(
                sessionKeyRef.current.privateKey,
              );
              createResizeChannelMessage(sessionSigner as any, {
                channel_id: data.channel_id as `0x${string}`,
                allocate_amount: toBigInt("100", 6),
                funds_destination: address as `0x${string}`,
                resize_amount: BigInt(0) as any,
              }).then((resizeMsg) => {
                sendMessage(JSON.parse(resizeMsg));
              });
            }
          } else if (data.status === "closed") {
            setChannelStatus("none");
            addMessage("info", "Channel closed");
            updateSession({ id: null, version: 0, allocations: [] });
          }
          break;

        case "create_channel":
          if (data && data.channel_id) {
            addMessage("info", "✓ Channel ID assigned by Yellow node");
            updateSession({ id: data.channel_id });

            if (nitroClientRef.current) {
              const { channel, state, server_signature } = data;
              const unsignedInitialState = {
                intent: state.intent,
                version: BigInt(state.version),
                data: state.state_data || state.data || "0x",
                allocations: state.allocations.map((a: any) => ({
                  destination: a.destination,
                  token: a.token,
                  amount: toBigInt(a.amount),
                })),
              };

              (async () => {
                try {
                  addMessage("info", "📡 Anchoring channel on Sepolia...");
                  const result = await nitroClientRef.current!.createChannel({
                    channel,
                    unsignedInitialState,
                    serverSignature: server_signature,
                  });

                  const txHash = typeof result === "string" ? result : (result as any).txHash || (result as any).hash;
                  setLastTxHash(txHash);
                  addMessage("info", `✅ Anchor TX submitted: ${txHash.slice(0, 10)}...`);

                  if (publicClientRef.current) {
                    addMessage("info", "⏳ Waiting for on-chain confirmation...");
                    await publicClientRef.current.waitForTransactionReceipt({
                      hash: txHash as `0x${string}`,
                      confirmations: 1,
                    });
                    addMessage("info", "✓ Channel anchored successfully!");
                  }
                  setChannelStatus("open");
                } catch (e: any) {
                  addMessage("error", `Anchor failed: ${e.message}`);
                  setChannelStatus("none");
                }
              })();
            }
          }
          break;

        case "resize_channel":
          if (data && data.channel_id) {
            addMessage("info", "✓ Resize response received from node");
          }
          if (data && nitroClientRef.current) {
            const { channel_id, state, server_signature } = data;
            const resizeState = {
              intent: state.intent,
              version: BigInt(state.version),
              data: state.state_data || state.data || "0x",
              allocations: state.allocations.map((a: any) => ({
                destination:
                  a.destination || a.destination_account || a.participant,
                token: a.token || a.asset,
                amount: toBigInt(a.amount),
              })),
              channelId: channel_id,
              serverSignature: server_signature,
            };

            (async () => {
              try {
                addMessage("info", "📡 Submitting funding to blockchain...");
                // Fetch proof states like hackmoney
                let proofStates: any[] = [];
                try {
                  const onChainData = await nitroClientRef.current!.getChannelData(channel_id as `0x${string}`);
                  if ((onChainData as any).lastValidState) {
                    proofStates = [(onChainData as any).lastValidState];
                  }
                } catch (e) {}

                const result = await nitroClientRef.current!.resizeChannel({
                  resizeState,
                  proofStates,
                });

                const txHash = typeof result === "string" ? result : (result as any).txHash || (result as any).hash;
                setLastTxHash(txHash);
                addMessage("info", `✅ Funding TX submitted: ${txHash.slice(0, 10)}...`);

                if (publicClientRef.current) {
                   await publicClientRef.current.waitForTransactionReceipt({
                    hash: txHash as `0x${string}`,
                    confirmations: 1,
                  });
                  addMessage("info", "✓ Funding confirmed on-chain!");
                }
                setChannelStatus("funded");
              } catch (e: any) {
                addMessage("error", `Funding failed: ${e.message}`);
              }
            })();
          }
          break;

        case "channels":
          if (
            data &&
            Array.isArray(data.channels) &&
            data.channels.length > 0
          ) {
            const activeChan = data.channels[0];
            addMessage(
              "info",
              `Found existing channel: ${activeChan.channel_id.slice(0, 8)}`,
            );
            setChannelStatus(
              activeChan.amount && parseFloat(activeChan.amount) > 0
                ? "funded"
                : "open",
            );
            updateSession({
              id: activeChan.channel_id,
              version: activeChan.version || 0,
              allocations: activeChan.allocations || [],
            });
          }
          break;

        case "ledger_balances":
        case "balances": {
          const balances = data.balances || data;
          if (Array.isArray(balances)) {
            const newBals: Record<string, string> = { ...ledgerBalances };
            balances.forEach((b: any) => {
              newBals[b.asset] = b.amount;
              newBals[b.asset.toLowerCase()] = b.amount;
            });
            setLedgerBalances(newBals);
          }
          break;
        }

        case "assets":
          if (data && data.assets) {
            setSupportedAssets(data.assets);
            supportedAssetsRef.current = data.assets;
            addMessage(
              "info",
              `✅ Assets Sync: ${data.assets.length} supported`,
            );
          }
          break;

        case "bu": // Balance Update
          if (data && data.balance_updates) {
            const bus = data.balance_updates;
            const newBals: Record<string, string> = { ...ledgerBalances };
            bus.forEach((b: any) => {
              const key = b.symbol || b.asset;
              newBals[key] = b.amount;
              newBals[key.toLowerCase()] = b.amount;
            });
            setLedgerBalances(newBals);
            addMessage(
              "info",
              `💰 Balance updated: ${bus.map((b: any) => `${b.amount} ${b.symbol || b.asset}`).join(", ")}`,
            );
          }
          break;

        case "app_session_created":
        case "app_state_submitted":
        case "tr":
        case "transfer":
          if (data) {
            addMessage(
              "info",
              `✅ Activity Confirmed: v${data.version || "?"}`,
            );
            updateSession({
              id:
                data.app_session_id || data.channel_id || sessionRef.current.id,
              version: data.version ?? sessionRef.current.version,
              allocations: data.allocations ?? sessionRef.current.allocations,
            });
          }
          break;

        case "close_channel":
          if (data && data.state && nitroClientRef.current) {
            const { channel_id, state, server_signature } = data;
            addMessage("info", `✓ Settlement signature obtained from node`);
            setChannelStatus("closing");

            const finalState = {
              intent: state.intent,
              version: BigInt(state.version),
              data: state.state_data || state.data || "0x",
              allocations: state.allocations.map((a: any) => ({
                destination: a.destination || a.participant || a.destination_account,
                token: a.token || a.asset,
                amount: toBigInt(a.amount),
              })),
              channelId: channel_id,
              serverSignature: server_signature,
            };

            (async () => {
              try {
                addMessage("info", "📡 Submitting settlement to blockchain...");
                const result = await nitroClientRef.current!.closeChannel({
                  finalState,
                  stateData: state.state_data || state.data || "0x",
                });

                const txHash = typeof result === "string" ? result : (result as any).txHash || (result as any).hash;
                setLastTxHash(txHash);
                addMessage("info", `✅ Settlement TX submitted: ${txHash.slice(0, 10)}...`);

                if (publicClientRef.current) {
                  await publicClientRef.current.waitForTransactionReceipt({
                    hash: txHash as `0x${string}`,
                    confirmations: 1,
                  });
                  addMessage("info", "✓ Settlement confirmed! Channel closed.");
                }
                setChannelStatus("closed");
                updateSession({ id: null, version: 0, allocations: [] });
              } catch (e: any) {
                addMessage("error", `Settlement failed: ${e.message}`);
                setChannelStatus("funded");
              }
            })();
          }
          break;
      }
    },
    [addMessage, sendMessage, updateSession, ledgerBalances, toBigInt],
  );

  // Actions
  const connect = useCallback(async () => {
    if (!address) return;
    setConnecting(true);
    addMessage("info", "Connecting to ClearNode...");

    const ws = new WebSocket(YELLOW_WS_URL);
    wsRef.current = ws;

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: "ping" }));
      }
    }, 20000);

    ws.onopen = async () => {
      setConnected(true);
      const sk = ethers.Wallet.createRandom();
      sessionKeyRef.current = sk;
      const expires_at = Math.floor(Date.now() / 1000) + 3600;
      const authParams = {
        address: address,
        session_key: sk.address,
        application: "xiphias-markets",
        allowances: [{ asset: "ytest.usd", amount: "1000" }],
        expires_at: expires_at,
        scope: "console",
      };
      pendingAuthRef.current = authParams;
      sendMessage({
        req: [++messageIdRef.current, "auth_request", authParams, Date.now()],
      });
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        handleMessage(raw);
      } catch (e) {
        console.error("WS Parse Error:", e);
        addMessage("error", "Failed to parse node message");
      }
    };

    ws.onclose = () => {
      clearInterval(pingInterval);
      setConnected(false);
      setAuthenticated(false);
      setChannelStatus("none");
      addMessage("info", "WebSocket closed. Please refresh or reconnect.");
    };
  }, [address, handleMessage, sendMessage]);

  const refreshVaultBalance = useCallback(async () => {
    if (!nitroClientRef.current || !address) return;
    try {
      const assetInfo = supportedAssetsRef.current.find(
        (a) => a.symbol === "ytest.usd" || a.asset === "ytest.usd",
      );
      const tokenAddress = assetInfo
        ? assetInfo.token || assetInfo.address
        : "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
      const bal = await nitroClientRef.current.getAccountBalance(
        tokenAddress as `0x${string}`,
      );
      setVaultBalance(ethers.formatUnits(bal, 6));
    } catch (e) {
      console.error("Failed to fetch vault balance", e);
    }
  }, [address]);

  // Request sandbox faucet tokens
  const requestFaucet = useCallback(async () => {
    if (!address) return;
    addMessage("info", "Requesting sandbox ytest.usd from faucet...");
    try {
      const response = await fetch(
        "https://clearnet-sandbox.yellow.com/faucet/requestTokens",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress: address }),
        }
      );
      if (response.ok) {
        addMessage("info", "✅ Faucet tokens credited to your Unified Balance!");
        // Trigger balance refresh
        sendMessage({
          req: [++messageIdRef.current, "get_ledger_balances", { account: address }, Date.now()],
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        addMessage("error", `Faucet request failed: ${errData.message || response.statusText}`);
      }
    } catch (e: any) {
      addMessage("error", `Faucet error: ${e.message}`);
    }
  }, [address, addMessage, sendMessage]);

  // Refresh custody contract balance (for withdrawable amounts)
  const refreshCustodyBalance = useCallback(async () => {
    if (!publicClientRef.current || !address) return;
    try {
      const result = await publicClientRef.current.readContract({
        address: CUSTODY_ADDRESS,
        abi: [{
          type: 'function',
          name: 'getAccountsBalances',
          inputs: [
            { name: 'users', type: 'address[]' },
            { name: 'tokens', type: 'address[]' }
          ],
          outputs: [{ type: 'uint256[]' }],
          stateMutability: 'view'
        }] as const,
        functionName: 'getAccountsBalances',
        args: [[address as `0x${string}`], [YTEST_USD_TOKEN]],
      }) as bigint[];
      const balance = result[0] ?? BigInt(0);
      setCustodyBalance(ethers.formatUnits(balance, 6));
      addMessage("info", `💰 Custody balance: ${ethers.formatUnits(balance, 6)} yUSD`);
    } catch (e) {
      console.error("Failed to fetch custody balance", e);
    }
  }, [address, addMessage]);

  const deposit = useCallback(
    async (amount: string) => {
      if (!nitroClientRef.current || !address) return;

      const assetInfo = supportedAssetsRef.current.find(
        (a) => a.symbol === "ytest.usd" || a.asset === "ytest.usd",
      );
      const tokenAddress = assetInfo
        ? assetInfo.token || assetInfo.address
        : "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
      const decimals = assetInfo ? assetInfo.decimals : 6;

      addMessage("info", `Deposit initiated for ${amount} yUSD...`);
      try {
        const tx = await nitroClientRef.current.deposit(
          tokenAddress as `0x${string}`,
          toBigInt(amount, decimals),
        );
        addMessage("info", `✅ Deposit Tx: ${tx}`);
        setTimeout(refreshVaultBalance, 5000);
      } catch (e: any) {
        addMessage("error", `Deposit failed: ${e.message}`);
      }
    },
    [address, addMessage, toBigInt, refreshVaultBalance],
  );

  const anchor = useCallback(async () => {
    if (!wsRef.current || !authenticated || !address) {
      addMessage("error", "Auth required for anchoring");
      return;
    }
    setChannelStatus("opening");
    addMessage("info", "Initiating channel anchor...");

    try {
      const sessionSigner = createECDSAMessageSigner(
        sessionKeyRef.current.privateKey,
      );
      const assetInfo = supportedAssetsRef.current.find(
        (a) => a.symbol === "ytest.usd" || a.asset === "ytest.usd",
      );
      const tokenAddress = assetInfo
        ? assetInfo.token || assetInfo.address
        : "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
      const chainId = assetInfo
        ? Number(assetInfo.chain_id || assetInfo.chainId)
        : 11155111;

      const createMsg = await createCreateChannelMessage(sessionSigner as any, {
        chain_id: chainId,
        token: tokenAddress as `0x${string}`,
      });

      sendMessage(JSON.parse(createMsg));

      // Funding attempt
      setTimeout(async () => {
        const currentSessionId = sessionRef.current.id;
        if (!currentSessionId) {
          addMessage(
            "error",
            "Channel ID not set yet, please try anchoring again",
          );
          return;
        }

        addMessage(
          "info",
          `Funding channel ${currentSessionId.slice(0, 8)}...`,
        );
        const resizeMsg = await createResizeChannelMessage(
          sessionSigner as any,
          {
            channel_id: currentSessionId as `0x${string}`,
            allocate_amount: toBigInt("500", 6),
            funds_destination: address as `0x${string}`,
            resize_amount: BigInt(0) as any,
          },
        );
        sendMessage(JSON.parse(resizeMsg));
      }, 6000);
    } catch (e: any) {
      addMessage("error", `Anchor failed: ${e.message}`);
      setChannelStatus("none");
    }
  }, [address, authenticated, sendMessage, addMessage, toBigInt]);

  const ensureActiveSession = useCallback(async () => {
    if (
      authenticated &&
      (channelStatus === "open" || channelStatus === "funded")
    )
      return true;

    setIsAutoInitializating(true);
    addMessage("info", "⛓️ Auto-initializing Yellow Session...");

    try {
      if (!connected) {
        await connect();
        // Wait for auth to complete (handleMessage sets authenticated)
        let attempts = 0;
        while (!authenticated && attempts < 20) {
          await new Promise((r) => setTimeout(r, 500));
          attempts++;
        }
      }

      if (authenticated && channelStatus === "none") {
        await anchor();
        // Wait for channel to open (transitions: none -> opening -> open)
        let attempts = 0;
        while ((channelStatus === "none" || channelStatus === "opening") && attempts < 60) {
          await new Promise((r) => setTimeout(r, 1000));
          attempts++;
        }
      }

      return (
        authenticated &&
        (channelStatus === "open" || channelStatus === "funded")
      );
    } catch (e) {
      addMessage("error", "Auto-init failed");
      return false;
    } finally {
      setIsAutoInitializating(false);
    }
  }, [authenticated, channelStatus, connected, connect, anchor, addMessage]);

  const buyShares = useCallback(
    async (amount: string, cost: string) => {
      const currentId = sessionRef.current.id;
      if (
        !wsRef.current ||
        !authenticated ||
        !currentId ||
        !address ||
        !sessionKeyRef.current
      ) {
        const ok = await ensureActiveSession();
        if (!ok) return;
      }

      addMessage(
        "info",
        `🛒 Executing Atomic Swap: ${cost} yUSD for ${amount} YES-shares`,
      );
      try {
        const sessionSigner = createECDSAMessageSigner(
          sessionKeyRef.current.privateKey,
        );
        const tokenAddress = "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
        const recipient = "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC"; // AMM Address

        const transferMsg = await createTransferMessage(sessionSigner as any, {
          destination: recipient as `0x${string}`,
          allocations: [
            {
              asset: tokenAddress,
              amount: toBigInt(cost, 6).toString(),
            },
          ],
        });

        sendMessage(JSON.parse(transferMsg));

        // Simulation: Node confirms and sends shares back instantly
        setTimeout(() => {
          const mockBu = {
            type: "bu",
            balance_updates: [
              {
                asset: "YES-shares",
                amount: amount,
                symbol: "YES",
              },
              {
                asset: "ytest.usd",
                amount: (
                  parseFloat(ledgerBalances["ytest.usd"] || "0") -
                  parseFloat(cost)
                ).toString(),
                symbol: "yUSD",
              },
            ],
          };
          handleMessage(mockBu);
        }, 500);
      } catch (e: any) {
        addMessage("error", `Atomic Swap failed: ${e.message}`);
      }
    },
    [
      address,
      authenticated,
      sendMessage,
      addMessage,
      ensureActiveSession,
      ledgerBalances,
      handleMessage,
    ],
  );

  const trade = useCallback(
    async (amount: string) => {
      const currentId = sessionRef.current.id;
      if (
        !wsRef.current ||
        !authenticated ||
        !currentId ||
        !address ||
        !sessionKeyRef.current
      ) {
        addMessage(
          "error",
          `Trade blocked: No active session or not authenticated`,
        );
        return;
      }

      addMessage("info", `Executing off-chain transfer: ${amount} yUSD`);
      try {
        const sessionSigner = createECDSAMessageSigner(
          sessionKeyRef.current.privateKey,
        );

        const tokenAddress = "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";
        const recipient = "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC";

        const transferMsg = await createTransferMessage(sessionSigner as any, {
          destination: recipient as `0x${string}`,
          allocations: [
            {
              asset: tokenAddress,
              amount: toBigInt(amount, 6).toString(),
            },
          ],
        });

        sendMessage(JSON.parse(transferMsg));
      } catch (e: any) {
        addMessage("error", `Transfer failed: ${e.message}`);
      }
    },
    [address, authenticated, sendMessage, addMessage],
  );

  const cashout = useCallback(async () => {
    const currentId = sessionRef.current.id;
    if (!wsRef.current || !authenticated || !currentId || !address) {
      addMessage("error", `Cashout blocked: No active session ID`);
      return;
    }

    // Check channel is in a valid state for closing
    if (channelStatus !== "open" && channelStatus !== "funded") {
      addMessage("error", `Cannot close channel in "${channelStatus}" state. Wait for channel to be confirmed.`);
      return;
    }

    addMessage(
      "info",
      `Requesting settlement for session ${currentId.slice(0, 8)}`,
    );
    try {
      const sessionSigner = createECDSAMessageSigner(
        sessionKeyRef.current.privateKey,
      );
      const req: any = {
        req: [
          ++messageIdRef.current,
          "close_channel",
          {
            channel_id: currentId as `0x${string}`,
            funds_destination: address as `0x${string}`,
          },
          Date.now(),
        ],
      };

      const signature = await (sessionSigner as any)(req.req);
      req.sig = [signature];
      sendMessage(req);
    } catch (e: any) {
      addMessage("error", `Cashout request failed: ${e.message}`);
    }
  }, [authenticated, address, sendMessage, addMessage, channelStatus]);

  const withdraw = useCallback(
    async (amount: string) => {
      if (!nitroClientRef.current || !publicClientRef.current || !address) {
        addMessage("error", "NitroliteClient not initialized");
        return;
      }

      addMessage("info", `Checking on-chain custody balance for withdrawal...`);

      try {
        // Poll custody contract for withdrawable balance (like hackmoney does)
        let withdrawableBalance = BigInt(0);
        let retries = 0;
        const maxRetries = 10;

        while (retries < maxRetries) {
          const result = await publicClientRef.current.readContract({
            address: CUSTODY_ADDRESS,
            abi: [{
              type: 'function',
              name: 'getAccountsBalances',
              inputs: [
                { name: 'users', type: 'address[]' },
                { name: 'tokens', type: 'address[]' }
              ],
              outputs: [{ type: 'uint256[]' }],
              stateMutability: 'view'
            }] as const,
            functionName: 'getAccountsBalances',
            args: [[address as `0x${string}`], [YTEST_USD_TOKEN]],
          }) as bigint[];

          withdrawableBalance = result[0] ?? BigInt(0);
          addMessage("info", `Custody balance: ${ethers.formatUnits(withdrawableBalance, 6)} yUSD (attempt ${retries + 1}/${maxRetries})`);

          if (withdrawableBalance > BigInt(0)) {
            break;
          }

          // Wait and retry
          addMessage("info", "⏳ Waiting for close TX to settle on chain...");
          await new Promise(r => setTimeout(r, 3000));
          retries++;
        }

        if (withdrawableBalance > BigInt(0)) {
          addMessage("info", `Withdrawing ${ethers.formatUnits(withdrawableBalance, 6)} yUSD to wallet...`);
          
          const withdrawalTx = await nitroClientRef.current.withdrawal(
            YTEST_USD_TOKEN,
            withdrawableBalance
          );
          
          const txHashStr = typeof withdrawalTx === 'string' ? withdrawalTx : (withdrawalTx as any)?.txHash || (withdrawalTx as any)?.hash || String(withdrawalTx);
          setLastTxHash(txHashStr);
          addMessage("info", `✅ Funds withdrawn! TX: ${txHashStr.slice(0, 12)}...`);
          
          // Reset channel state
          setChannelStatus("none");
          updateSession({ id: null, version: 0, allocations: [] });
          setCustodyBalance("0.00");
        } else {
          addMessage("error", "No funds available yet. The close TX may still be pending.");
        }
      } catch (e: any) {
        addMessage("error", `Withdraw failed: ${e.message}`);
      }
    },
    [address, addMessage, updateSession],
  );

  // Initialization: Nitrolite Client
  useEffect(() => {
    if (isConnected && address && walletClient) {
      const pc = createPublicClient({
        chain: sepolia,
        transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
      });
      const wc = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum as any),
        account: address as `0x${string}`,
      });

      nitroClientRef.current = new NitroliteClient({
        publicClient: pc as any,
        walletClient: wc as any,
        stateSigner: new WalletStateSigner(wc as any),
        addresses: {
          custody: "0x019B65A265EB3363822f2752141b3dF16131b262",
          adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",
          tokenAddress: "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
        } as any,
        chainId: 11155111,
        challengeDuration: BigInt(3600),
      });
      publicClientRef.current = pc;
      addMessage("info", "🛠 Nitrolite Client initialized");
    }
  }, [isConnected, address, walletClient, addMessage]);

  return (
    <YellowContext.Provider
      value={{
        connected,
        authenticated,
        connecting,
        channelStatus,
        session,
        ledgerBalances,
        vaultBalance,
        custodyBalance,
        lastTxHash,
        isAutoInitializating,
        connect,
        ensureActiveSession,
        requestFaucet,
        deposit,
        anchor,
        buyShares,
        trade,
        cashout,
        withdraw,
        messages,
        withdrawableItems,
      }}
    >
      {children}
    </YellowContext.Provider>
  );
}

export function useYellow() {
  const context = useContext(YellowContext);
  if (!context) throw new Error("useYellow must be used within YellowProvider");
  return context;
}
