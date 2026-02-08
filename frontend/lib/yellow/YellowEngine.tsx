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
  createAuthVerifyMessage,
  createAuthVerifyMessageWithJWT,
  createEIP712AuthMessageSigner,
  createECDSAMessageSigner,
  createGetLedgerBalancesMessage,
  createGetConfigMessage,
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createSubmitAppStateMessage,
  parseAnyRPCResponse,
  RPCMethod,
  NitroliteClient,
  WalletStateSigner,
  RPCProtocolVersion,
  RPCAppStateIntent,
  type AuthChallengeResponse,
  type GetLedgerBalancesResponse,
  type BalanceUpdateResponse,
  type AuthRequestParams,
} from "@erc7824/nitrolite";
import { createWalletClient, createPublicClient, custom, http, type Address, type WalletClient, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const SEPOLIA_CUSTODY_ADDRESS = "0x019B65A265EB3363822f2752141b3dF16131b262" as const;
const SEPOLIA_ADJUDICATOR_ADDRESS = "0x7c7ccbc98469190849BCC6c926307794fDfB11F2" as const;
const YTEST_USD_TOKEN = "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb" as const;
const SESSION_DURATION = 3600;
const AUTH_SCOPE = "xiphias-markets.app";
const APP_NAME = "Xiphias Markets";
const CLOB_SERVER_URL = "http://localhost:3001";

const getAuthDomain = () => ({ name: APP_NAME });

interface SessionKey {
  privateKey: `0x${string}`;
  address: Address;
}

const SESSION_KEY_STORAGE = "xiphias_session_key";
const JWT_KEY = "xiphias_jwt_token";

const generateSessionKey = (): SessionKey => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
};

const getStoredSessionKey = (): SessionKey | null => {
  try {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(SESSION_KEY_STORAGE);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed.privateKey || !parsed.address) return null;
    return parsed as SessionKey;
  } catch {
    return null;
  }
};

const storeSessionKey = (sk: SessionKey) => {
  try { localStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(sk)); } catch {}
};

const removeSessionKey = () => {
  try { localStorage.removeItem(SESSION_KEY_STORAGE); } catch {}
};

const storeJWT = (token: string) => {
  try { localStorage.setItem(JWT_KEY, token); } catch {}
};

const removeJWT = () => {
  try { localStorage.removeItem(JWT_KEY); } catch {}
};

const getStoredJWT = (): string | null => {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(JWT_KEY);
  } catch {
    return null;
  }
};

type WsStatus = "Connecting" | "Connected" | "Disconnected";
type MessageListener = (data: unknown) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private status: WsStatus = "Disconnected";
  private statusListeners: Set<(s: WsStatus) => void> = new Set();
  private messageListeners: Set<MessageListener> = new Set();
  private messageQueue: string[] = [];

  public connect() {
    if (this.socket && this.socket.readyState < 2) return;
    const wsUrl = "wss://clearnet-sandbox.yellow.com/ws";
    this.updateStatus("Connecting");
    this.socket = new WebSocket(wsUrl);
    this.socket.onopen = () => {
      this.updateStatus("Connected");
      this.messageQueue.forEach((msg) => this.socket?.send(msg));
      this.messageQueue = [];
    };
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageListeners.forEach((l) => l(data));
      } catch {}
    };
    this.socket.onclose = () => this.updateStatus("Disconnected");
    this.socket.onerror = () => this.updateStatus("Disconnected");
  }

  public send(payload: string) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(payload);
    else this.messageQueue.push(payload);
  }

  private updateStatus(s: WsStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  public addStatusListener(l: (s: WsStatus) => void) { this.statusListeners.add(l); l(this.status); }
  public removeStatusListener(l: (s: WsStatus) => void) { this.statusListeners.delete(l); }
  public addMessageListener(l: MessageListener) { this.messageListeners.add(l); }
  public removeMessageListener(l: MessageListener) { this.messageListeners.delete(l); }
  public getStatus() { return this.status; }
}

const webSocketService = new WebSocketService();

// ==================== CLOB UTILITIES ====================
interface CLOBInfo {
  address: Address;
  sessionKey: Address;
  authenticated: boolean;
}

async function fetchCLOBInfo(): Promise<CLOBInfo | null> {
  try {
    const r = await fetch(`${CLOB_SERVER_URL}/clob-address`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function getCLOBSignature(message: unknown): Promise<string | null> {
  try {
    const r = await fetch(`${CLOB_SERVER_URL}/api/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign-create-session", message }),
    });
    if (!r.ok) return null;
    const { signature } = await r.json();
    return signature;
  } catch {
    return null;
  }
}

export interface YellowMessage {
  type: "info" | "error" | "sent" | "received";
  content: string;
  timestamp: Date;
}

interface YellowContextType {
  // Wallet
  account: Address | null;
  connectWallet: () => Promise<void>;
  
  // WebSocket
  wsStatus: WsStatus;
  
  // Auth
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  
  // Ledger Balance
  ledgerBalance: string;
  
  // CLOB
  clobInfo: CLOBInfo | null;
  
  // App Session
  appSessionId: string | null;
  appSessionStatus: "none" | "creating" | "active" | "closing" | "closed";
  payerBalance: number;
  payeeBalance: number;
  sessionVersion: number;
  isSessionLoading: boolean;
  
  // Actions
  createAppSession: (initialAmount?: number) => Promise<void>;
  sendPaymentToCLOB: (amount: number) => Promise<boolean>;
  closeSession: () => Promise<void>;
  requestFaucet: () => Promise<void>;
  
  // Logs
  messages: YellowMessage[];
}

const YellowContext = createContext<YellowContextType | undefined>(undefined);

// ==================== PROVIDER ====================
export function YellowProvider({ children }: { children: React.ReactNode }) {
  // Wallet
  const [account, setAccount] = useState<Address | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [nitroliteClient, setNitroliteClient] = useState<NitroliteClient | null>(null);

  // WebSocket
  const [wsStatus, setWsStatus] = useState<WsStatus>("Disconnected");

  // Auth
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthAttempted, setIsAuthAttempted] = useState(false);
  const [sessionExpireTimestamp, setSessionExpireTimestamp] = useState("");

  // Ledger balances
  const [balances, setBalances] = useState<Record<string, string> | null>(null);

  // CLOB
  const [clobInfo, setClobInfo] = useState<CLOBInfo | null>(null);

  // App Session
  const [appSessionId, setAppSessionId] = useState<string | null>(null);
  const [appSessionStatus, setAppSessionStatus] = useState<"none" | "creating" | "active" | "closing" | "closed">("none");
  const [sessionVersion, setSessionVersion] = useState(1);
  const [payerBalance, setPayerBalance] = useState(0);
  const [payeeBalance, setPayeeBalance] = useState(0);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  
  // Messages
  const [messages, setMessages] = useState<YellowMessage[]>([]);

  const addMessage = useCallback((type: YellowMessage["type"], content: string) => {
    setMessages((prev) => [{ type, content, timestamp: new Date() }, ...prev].slice(0, 100));
  }, []);

  // ==================== CONNECT WALLET ====================
  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !(window as unknown as { ethereum?: unknown }).ethereum) {
      addMessage("error", "Please install MetaMask!");
      return;
    }

    try {
      addMessage("info", "Connecting wallet...");
      const ethereum = (window as unknown as { ethereum: unknown }).ethereum;
      
      // Check/switch to Sepolia
      const chainId = await (ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<string> }).request({ method: "eth_chainId" });
      if (chainId !== "0xaa36a7") {
        try {
          await (ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<void> }).request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
          });
        } catch (e: unknown) {
          if ((e as { code?: number }).code === 4902) {
            await (ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<void> }).request({
              method: "wallet_addEthereumChain",
              params: [{ chainId: "0xaa36a7", chainName: "Sepolia", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://sepolia.drpc.org"], blockExplorerUrls: ["https://sepolia.etherscan.io"] }],
            });
          } else throw e;
        }
      }

      const tempClient = createWalletClient({ chain: sepolia, transport: custom(ethereum as Parameters<typeof custom>[0]) });
      const [address] = await tempClient.requestAddresses();
      const client = createWalletClient({ account: address, chain: sepolia, transport: custom(ethereum as Parameters<typeof custom>[0]) });
      const pubClient = createPublicClient({ chain: sepolia, transport: http("https://1rpc.io/sepolia") });
      const nitroClient = new NitroliteClient({
        publicClient: pubClient,
        walletClient: client,
        stateSigner: new WalletStateSigner(client),
        addresses: { custody: SEPOLIA_CUSTODY_ADDRESS, adjudicator: SEPOLIA_ADJUDICATOR_ADDRESS },
        chainId: sepolia.id,
        challengeDuration: BigInt(3600),
      });

      setWalletClient(client);
      setPublicClient(pubClient);
      setNitroliteClient(nitroClient);
      setAccount(address);
      addMessage("info", `✓ Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error) {
      addMessage("error", `Wallet connection failed: ${(error as Error).message}`);
    }
  }, [addMessage]);

  // ==================== WEBSOCKET + SESSION KEY INIT ====================
  useEffect(() => {
    const existing = getStoredSessionKey();
    if (existing) {
      setSessionKey(existing);
    } else {
      const sk = generateSessionKey();
      storeSessionKey(sk);
      setSessionKey(sk);
    }
    webSocketService.addStatusListener(setWsStatus);
    webSocketService.connect();
    return () => { webSocketService.removeStatusListener(setWsStatus); };
  }, []);

  useEffect(() => {
    const check = async () => {
      const info = await fetchCLOBInfo();
      setClobInfo(info);
      if (info?.authenticated) {
        addMessage("info", `✓ CLOB Server connected: ${info.address.slice(0, 8)}...`);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [addMessage]);

  // ==================== AUTO-AUTH ====================
  useEffect(() => {
    if (account && sessionKey && wsStatus === "Connected" && !isAuthenticated && !isAuthAttempted) {
      setIsAuthAttempted(true);
      
      const jwt = getStoredJWT();
      if (jwt) {
        addMessage("info", "Attempting JWT re-authentication...");
        createAuthVerifyMessageWithJWT(jwt)
          .then((p) => webSocketService.send(p))
          .catch(() => { removeJWT(); setIsAuthAttempted(false); });
        return;
      }

      const expire = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);
      setSessionExpireTimestamp(expire);
      const authParams: AuthRequestParams = {
        address: account,
        session_key: sessionKey.address,
        expires_at: BigInt(Math.floor(Date.now() / 1000) + SESSION_DURATION),
        scope: AUTH_SCOPE,
        application: APP_NAME,
        allowances: [{ asset: "ytest.usd", amount: "1000000" }],
      };
      addMessage("info", "Sending auth request (EIP-712 signature required)...");
      createAuthRequestMessage(authParams).then((p) => webSocketService.send(p));
    }
  }, [account, sessionKey, wsStatus, isAuthenticated, isAuthAttempted, addMessage]);

  useEffect(() => {
    if (isAuthenticated && sessionKey && account) {
      const signer = createECDSAMessageSigner(sessionKey.privateKey);
      createGetLedgerBalancesMessage(signer, account).then((p) => webSocketService.send(p));
    }
  }, [isAuthenticated, sessionKey, account]);

  useEffect(() => {
    const handler = async (data: unknown) => {
      const response = parseAnyRPCResponse(JSON.stringify(data));
      addMessage("received", `${response.method}: ${JSON.stringify(response.params).slice(0, 100)}...`);

      // Auth challenge
      if (response.method === RPCMethod.AuthChallenge && walletClient && sessionKey && account && sessionExpireTimestamp) {
        const challengeResponse = response as AuthChallengeResponse;
        addMessage("info", "🔐 Auth challenge received, signing...");
        const authParams = {
          scope: AUTH_SCOPE,
          application: APP_NAME,
          participant: sessionKey.address,
          session_key: sessionKey.address,
          expires_at: BigInt(sessionExpireTimestamp),
          allowances: [{ asset: "ytest.usd", amount: "1000000" }],
        };
        try {
          const signer = createEIP712AuthMessageSigner(walletClient, authParams, getAuthDomain());
          const payload = await createAuthVerifyMessage(signer, challengeResponse);
          webSocketService.send(payload);
        } catch {
          setIsAuthAttempted(false);
          addMessage("error", "Signature rejected");
        }
      }

      // Auth success
      if (response.method === RPCMethod.AuthVerify && response.params?.success) {
        setIsAuthenticated(true);
        addMessage("info", "✓ Authenticated with EIP-712!");
        if (response.params.jwtToken) storeJWT(response.params.jwtToken);
        // Fetch balances
        if (sessionKey && account) {
          const signer = createECDSAMessageSigner(sessionKey.privateKey);
          createGetLedgerBalancesMessage(signer, account).then((p) => webSocketService.send(p));
        }
      }

      // Balances
      if (response.method === RPCMethod.GetLedgerBalances) {
        const br = response as GetLedgerBalancesResponse;
        if (br.params.ledgerBalances?.length) {
          setBalances(Object.fromEntries(br.params.ledgerBalances.map((b) => [b.asset, b.amount])));
        } else {
          setBalances({});
        }
      }

      if (response.method === RPCMethod.BalanceUpdate) {
        const bu = response as BalanceUpdateResponse;
        setBalances(Object.fromEntries(bu.params.balanceUpdates.map((b) => [b.asset, b.amount])));
        addMessage("info", `💰 Balance updated`);
      }

      // App Session created
      if (response.method === RPCMethod.CreateAppSession) {
        const params = response.params as { appSessionId?: string; app_session_id?: string; error?: string };
        if (params.appSessionId || params.app_session_id) {
          const sid = params.appSessionId || params.app_session_id;
          setAppSessionId(sid!);
          setAppSessionStatus("active");
          setSessionVersion(1);
          addMessage("info", `✓ App Session created: ${sid!.slice(0, 10)}...`);
        } else if (params.error) {
          addMessage("error", `Session creation failed: ${params.error}`);
          setAppSessionStatus("none");
        }
        setIsSessionLoading(false);
      }

      // App Session closed
      if (response.method === RPCMethod.CloseAppSession) {
        const params = response.params as { success?: boolean; error?: string };
        if (params.success || !params.error) {
          setAppSessionId(null);
          setAppSessionStatus("closed");
          setSessionVersion(1);
          setPayerBalance(0);
          setPayeeBalance(0);
          addMessage("info", "✓ App Session closed! Funds returned to ledger.");
        } else {
          addMessage("error", `Close failed: ${params.error}`);
          setAppSessionStatus("active");
        }
        setIsSessionLoading(false);
      }

      // Errors
      if (response.method === RPCMethod.Error) {
        const msg = (response.params as { error?: string })?.error || "Unknown error";
        addMessage("error", `RPC Error: ${msg}`);
        if (msg.includes("auth") || msg.includes("expired") || msg.includes("jwt")) {
          removeJWT();
          removeSessionKey();
          setIsAuthAttempted(false);
        }
      }
    };

    webSocketService.addMessageListener(handler);
    return () => webSocketService.removeMessageListener(handler);
  }, [walletClient, sessionKey, sessionExpireTimestamp, account, addMessage]);

  // ==================== CREATE APP SESSION ====================
  const createAppSession = useCallback(async (initialAmount: number = 100) => {
    if (!sessionKey || !account) {
      addMessage("error", "Please connect wallet first");
      return;
    }

    setIsSessionLoading(true);
    setAppSessionStatus("creating");
    addMessage("info", `Creating App Session with ${initialAmount} yUSD...`);

    try {
      const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
      
      // Use CLOB as partner if available, otherwise use a default payee address
      const partnerAddress = clobInfo?.authenticated 
        ? clobInfo.address 
        : "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC" as Address; // Default payee

      const appDefinition = {
        application: APP_NAME,
        protocol: RPCProtocolVersion.NitroRPC_0_4,
        participants: [account, partnerAddress] as `0x${string}`[],
        weights: clobInfo?.authenticated ? [50, 50] : [100, 0],
        quorum: 100,
        challenge: 0,
        nonce: Date.now(),
      };

      const allocations = [
        { participant: account, asset: "ytest.usd", amount: String(initialAmount) },
        { participant: partnerAddress, asset: "ytest.usd", amount: "0" },
      ];

      const msg = await createAppSessionMessage(messageSigner, { definition: appDefinition, allocations });
      const msgJson = JSON.parse(msg);

      // Get CLOB co-signature if available
      if (clobInfo?.authenticated) {
        addMessage("info", "Getting CLOB co-signature...");
        const clobSig = await getCLOBSignature(msgJson);
        if (clobSig) {
          msgJson.sig.push(clobSig);
          addMessage("info", "✓ Multi-party signature obtained");
        }
      }

      addMessage("sent", `CreateAppSession: ${JSON.stringify(msgJson).slice(0, 100)}...`);
      webSocketService.send(JSON.stringify(msgJson));
      setPayerBalance(initialAmount);
      setPayeeBalance(0);
    } catch (error) {
      addMessage("error", `Session creation failed: ${(error as Error).message}`);
      setAppSessionStatus("none");
      setIsSessionLoading(false);
    }
  }, [sessionKey, account, clobInfo, addMessage]);

  // ==================== SEND PAYMENT TO CLOB ====================
  const sendPaymentToCLOB = useCallback(async (amount: number): Promise<boolean> => {
    if (!sessionKey || !appSessionId || !account) {
      addMessage("error", "No active session");
      return false;
    }

    if (payerBalance < amount) {
      addMessage("error", `Insufficient session balance: ${payerBalance} < ${amount}`);
      return false;
    }

    addMessage("info", `⚡ Sending ${amount} yUSD instant payment...`);

    try {
      const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
      const partnerAddress = clobInfo?.address || "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC" as Address;

      const newPayerBalance = (payerBalance - amount).toString();
      const newPayeeBalance = (payeeBalance + amount).toString();
      const nextVersion = sessionVersion + 1;

      const stateMsg = await createSubmitAppStateMessage<RPCProtocolVersion.NitroRPC_0_4>(messageSigner, {
        app_session_id: appSessionId as `0x${string}`,
        intent: RPCAppStateIntent.Operate,
        version: nextVersion,
        allocations: [
          { participant: account, asset: "ytest.usd", amount: newPayerBalance },
          { participant: partnerAddress, asset: "ytest.usd", amount: newPayeeBalance },
        ],
      });

      const msgJson = JSON.parse(stateMsg);

      // Get CLOB co-signature if available
      if (clobInfo?.authenticated) {
        const clobSig = await getCLOBSignature(msgJson);
        if (clobSig) {
          msgJson.sig.push(clobSig);
        } else {
          addMessage("error", "CLOB signature required but not available");
          return false;
        }
      }

      webSocketService.send(JSON.stringify(msgJson));

      setPayerBalance(parseFloat(newPayerBalance));
      setPayeeBalance(parseFloat(newPayeeBalance));
      setSessionVersion(nextVersion);
      addMessage("info", `✓ Sent ${amount} yUSD instantly! (No gas, v${nextVersion})`);
      return true;
    } catch (error) {
      addMessage("error", `Payment failed: ${(error as Error).message}`);
      return false;
    }
  }, [sessionKey, appSessionId, account, clobInfo, payerBalance, payeeBalance, sessionVersion, addMessage]);

  const closeSession = useCallback(async () => {
    if (!sessionKey || !appSessionId || !account) {
      addMessage("error", "No active session");
      return;
    }

    setIsSessionLoading(true);
    setAppSessionStatus("closing");
    addMessage("info", "Closing App Session...");

    try {
      const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);
      const partnerAddress = clobInfo?.address || "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC" as Address;

      const closeMsg = await createCloseAppSessionMessage(messageSigner, {
        app_session_id: appSessionId as `0x${string}`,
        allocations: [
          { participant: account, asset: "ytest.usd", amount: String(payerBalance) },
          { participant: partnerAddress, asset: "ytest.usd", amount: String(payeeBalance) },
        ],
      });

      const msgJson = JSON.parse(closeMsg);

      // Get CLOB co-signature if available
      if (clobInfo?.authenticated) {
        const clobSig = await getCLOBSignature(msgJson);
        if (clobSig) {
          msgJson.sig.push(clobSig);
        }
      }

      webSocketService.send(JSON.stringify(msgJson));
    } catch (error) {
      addMessage("error", `Close failed: ${(error as Error).message}`);
      setAppSessionStatus("active");
      setIsSessionLoading(false);
    }
  }, [sessionKey, appSessionId, account, clobInfo, payerBalance, payeeBalance, addMessage]);

  const requestFaucet = useCallback(async () => {
    if (!account) {
      addMessage("error", "Connect wallet first");
      return;
    }
    addMessage("info", "Requesting faucet tokens...");
    try {
      const res = await fetch("https://clearnet-sandbox.yellow.com/faucet/requestTokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: account }),
      });
      const data = await res.json();
      if (data.success) {
        addMessage("info", `✓ Faucet: +${data.amount} ${data.asset} credited!`);
        // Refresh balances
        if (sessionKey) {
          const signer = createECDSAMessageSigner(sessionKey.privateKey);
          createGetLedgerBalancesMessage(signer, account).then((p) => webSocketService.send(p));
        }
      } else {
        addMessage("error", `Faucet failed: ${data.message}`);
      }
    } catch (error) {
      addMessage("error", `Faucet error: ${(error as Error).message}`);
    }
  }, [account, sessionKey, addMessage]);

  return (
    <YellowContext.Provider
      value={{
        account,
        connectWallet,
        wsStatus,
        isAuthenticated,
        isAuthenticating: isAuthAttempted && !isAuthenticated,
        ledgerBalance: balances?.["ytest.usd"] ?? "0",
        clobInfo,
        appSessionId,
        appSessionStatus,
        payerBalance,
        payeeBalance,
        sessionVersion,
        isSessionLoading,
        createAppSession,
        sendPaymentToCLOB,
        closeSession,
        requestFaucet,
        messages,
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
