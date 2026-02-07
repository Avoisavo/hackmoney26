'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
    createAuthRequestMessage,
    createCreateChannelMessage,
    createResizeChannelMessage,
    createTransferMessage,
    createCloseChannelMessage,
    createECDSAMessageSigner,
    NitroliteClient,
    WalletStateSigner,
} from '@erc7824/nitrolite';
import { ethers } from 'ethers';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import { useAccount, useWalletClient } from 'wagmi';

// --- Config ---
const YELLOW_WS_URL = 'wss://clearnet-sandbox.yellow.com/ws';

interface YellowContextType {
    connected: boolean;
    authenticated: boolean;
    connecting: boolean;
    channelStatus: 'none' | 'opening' | 'open' | 'funding' | 'funded';
    session: any;
    ledgerBalances: Record<string, string>;
    connect: () => Promise<void>;
    anchor: () => Promise<void>;
    trade: (amount: string) => Promise<void>;
    cashout: () => Promise<void>;
    withdraw: (amount: string) => Promise<void>;
    messages: any[];
}

const YellowContext = createContext<YellowContextType | undefined>(undefined);

export function YellowProvider({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    
    // Internal state
    const [connected, setConnected] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [channelStatus, setChannelStatus] = useState<'none' | 'opening' | 'open' | 'funding' | 'funded'>('none');
    const [session, setSession] = useState<any>({ id: null, version: 0, allocations: [] });
    const [ledgerBalances, setLedgerBalances] = useState<Record<string, string>>({});
    const [supportedAssets, setSupportedAssets] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const messageIdRef = useRef(0);
    const nitroClientRef = useRef<NitroliteClient | null>(null);
    const sessionKeyRef = useRef<any>(null);
    const pendingAuthRef = useRef<any>(null);
    const supportedAssetsRef = useRef<any[]>([]);
    const sessionRef = useRef<any>({ id: null, version: 0, allocations: [] });

    const addMessage = useCallback((type: string, content: string) => {
        setMessages((prev: any[]) => [{ type, content, timestamp: new Date() }, ...prev].slice(0, 100));
    }, []);

    const sendMessage = useCallback((req: any) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            addMessage('error', 'Socket not open');
            return;
        }
        const msgStr = JSON.stringify(req);
        addMessage('sent', msgStr);
        wsRef.current.send(msgStr);
    }, [addMessage]);

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
    const handleMessage = useCallback(async (msg: any) => {
        addMessage('received', JSON.stringify(msg));
        
        const res = msg.res;
        let method = '';
        let data: any = null;

        if (Array.isArray(res)) {
            [ , method, data] = res;
        } else {
            method = msg.method || msg.type || '';
            data = msg.params || msg.result || msg;
        }

        // Auto-handle errors
        if (method === 'error' || (data && data.error)) {
            const err = data?.error || JSON.stringify(data);
            addMessage('error', `Node Error: ${err}`);
            return;
        }

        switch (method) {
            case 'challenge':
            case 'auth_challenge':
                const challenge = data.challenge_message || data.challengeMessage || data;
                if (challenge && typeof challenge === 'string') {
                    addMessage('info', `🔐 Challenge received: ${challenge.slice(0, 8)}...`);
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
                            { name: "allowances", type: "Allowance[]" }
                        ],
                        Allowance: [
                            { name: "asset", type: "string" },
                            { name: "amount", type: "string" }
                        ]
                    };
                    const authMsg = {
                        challenge: challenge,
                        scope: pendingAuthRef.current.scope,
                        wallet: pendingAuthRef.current.address,
                        session_key: pendingAuthRef.current.session_key,
                        expires_at: pendingAuthRef.current.expires_at,
                        allowances: pendingAuthRef.current.allowances
                    };

                    const signature = await signer.signTypedData(domain, types, authMsg);
                    sendMessage({
                        req: [++messageIdRef.current, 'auth_verify', { challenge }, Date.now()],
                        sig: [signature]
                    });
                }
                break;

            case 'auth_verify':
            case 'result':
                if (data && (data.jwt_token || data.jwtToken)) {
                    setAuthenticated(true);
                    setConnecting(false);
                    addMessage('info', '✅ Authenticated');
                    // Sync channels and balances immediately
                    sendMessage({ req: [++messageIdRef.current, 'get_channels', {}, Date.now()] });
                }
                break;

            case 'cu':
                if (data.status === 'open') {
                    const amount = parseFloat(data.amount || "0");
                    setChannelStatus(amount > 0 ? 'funded' : 'open');
                    addMessage('info', `Channel ${data.channel_id.slice(0, 8)} is ${amount > 0 ? 'FUNDED' : 'OPEN'}`);
                    updateSession({ 
                        id: data.channel_id, 
                        version: data.version ?? sessionRef.current.version,
                        allocations: data.allocations ?? sessionRef.current.allocations
                    });
                } else if (data.status === 'closed') {
                    setChannelStatus('none');
                    addMessage('info', 'Channel closed');
                    updateSession({ id: null, version: 0, allocations: [] });
                }
                break;

            case 'create_channel':
                if (data && data.channel_id) {
                    addMessage('info', '✓ Channel ID assigned by node');
                    updateSession({ id: data.channel_id });
                    
                    if (nitroClientRef.current) {
                        const { channel, state, server_signature } = data;
                        const unsignedInitialState = {
                            intent: state.intent,
                            version: BigInt(state.version),
                            data: state.state_data || '0x',
                            allocations: state.allocations.map((a: any) => ({
                                destination: a.destination,
                                token: a.token,
                                amount: toBigInt(a.amount),
                            })),
                        };
                        nitroClientRef.current.createChannel({
                            channel,
                            unsignedInitialState,
                            serverSignature: server_signature,
                        }).then(() => addMessage('info', '✅ Anchor Tx submitted'));
                    }
                }
                break;

            case 'resize_channel':
                if (data && data.channel_id) {
                    addMessage('info', '✓ Funding Confirmed');
                    updateSession({ id: data.channel_id });
                }
                if (data && nitroClientRef.current) {
                    const { channel_id, state, server_signature } = data;
                    const resizeState = {
                        intent: state.intent,
                        version: BigInt(state.version),
                        data: state.state_data || state.data || '0x',
                        allocations: state.allocations.map((a: any) => ({
                            destination: a.destination || a.destination_account || a.participant,
                            token: a.token || a.asset,
                            amount: toBigInt(a.amount),
                        })),
                        channelId: channel_id,
                        serverSignature: server_signature,
                    };
                    nitroClientRef.current.resizeChannel({
                        resizeState,
                        proofStates: []
                    }).then(() => addMessage('info', '✅ Funding Tx submitted'));
                }
                break;

            case 'channels':
                if (data && Array.isArray(data.channels) && data.channels.length > 0) {
                    const activeChan = data.channels[0];
                    addMessage('info', `Found existing channel: ${activeChan.channel_id.slice(0, 8)}`);
                    setChannelStatus(activeChan.amount && parseFloat(activeChan.amount) > 0 ? 'funded' : 'open');
                    updateSession({
                        id: activeChan.channel_id,
                        version: activeChan.version || 0,
                        allocations: activeChan.allocations || []
                    });
                }
                break;

            case 'ledger_balances':
            case 'balances': {
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

            case 'assets':
                if (data && data.assets) {
                    setSupportedAssets(data.assets);
                    supportedAssetsRef.current = data.assets;
                    addMessage('info', `✅ Assets Sync: ${data.assets.length} supported`);
                }
                break;

            case 'bu': // Balance Update
                if (data && data.balance_updates) {
                    const bus = data.balance_updates;
                    const newBals: Record<string, string> = { ...ledgerBalances };
                    bus.forEach((b: any) => {
                        newBals[b.asset] = b.amount;
                        newBals[b.asset.toLowerCase()] = b.amount;
                    });
                    setLedgerBalances(newBals);
                    addMessage('info', `💰 Balance updated: ${bus.map((b: any) => `${b.amount} ${b.symbol || b.asset}`).join(', ')}`);
                }
                break;

            case 'app_session_created':
            case 'app_state_submitted':
            case 'tr':
            case 'transfer':
                if (data) {
                    addMessage('info', `✅ Activity Confirmed: v${data.version || '?'}`);
                    updateSession({
                        id: data.app_session_id || data.channel_id || sessionRef.current.id,
                        version: data.version ?? sessionRef.current.version,
                        allocations: data.allocations ?? sessionRef.current.allocations
                    });
                }
                break;

            case 'close_channel':
                if (data && data.state && nitroClientRef.current) {
                    const { channel_id, state, server_signature } = data;
                    addMessage('info', `✓ Settlement signature obtained`);
                    
                    try {
                        const finalState = {
                            intent: state.intent,
                            version: BigInt(state.version),
                            data: state.state_data || state.data || '0x',
                            allocations: state.allocations.map((a: any) => ({
                                destination: a.destination || a.destination_account || a.participant,
                                token: a.token || a.asset,
                                amount: toBigInt(a.amount),
                            })),
                            channelId: channel_id,
                            serverSignature: server_signature,
                        };

                        // @ts-ignore
                        await nitroClientRef.current.closeChannel({
                            finalState,
                            stateData: state.state_data || state.data || '0x',
                        });
                        addMessage('info', '✅ Final settlement tx submitted');
                        setChannelStatus('none');
                    } catch (e: any) {
                        addMessage('error', `Settlement failed: ${e.message}`);
                    }
                }
                break;
        }
    }, [addMessage, sendMessage, updateSession, ledgerBalances, toBigInt]);

    // Actions
    const connect = useCallback(async () => {
        if (!address) return;
        setConnecting(true);
        addMessage('info', 'Connecting to ClearNode...');

        const ws = new WebSocket(YELLOW_WS_URL);
        wsRef.current = ws;

        ws.onopen = async () => {
            setConnected(true);
            const sk = ethers.Wallet.createRandom();
            sessionKeyRef.current = sk;
            const expires_at = Math.floor(Date.now() / 1000) + 3600;
            const authParams = {
                address: address,
                session_key: sk.address,
                application: 'xiphias-markets',
                allowances: [{ asset: 'ytest.usd', amount: '1000' }],
                expires_at: expires_at,
                scope: 'console'
            };
            pendingAuthRef.current = authParams;
            sendMessage({ req: [++messageIdRef.current, 'auth_request', authParams, Date.now()] });
        };

        ws.onmessage = (event) => {
            try { 
                const raw = JSON.parse(event.data);
                handleMessage(raw); 
            } catch (e) {
                console.error("WS Parse Error:", e);
                addMessage('error', 'Failed to parse node message');
            }
        };

        ws.onclose = () => {
            setConnected(false);
            setAuthenticated(false);
            setChannelStatus('none');
            addMessage('info', 'WebSocket closed');
        };
    }, [address, handleMessage, sendMessage]);

    const anchor = useCallback(async () => {
        if (!wsRef.current || !authenticated || !address) {
            addMessage('error', 'Auth required for anchoring');
            return;
        }
        setChannelStatus('opening');
        addMessage('info', 'Initiating channel anchor...');
        
        try {
            const sessionSigner = createECDSAMessageSigner(sessionKeyRef.current.privateKey);
            const assetInfo = supportedAssetsRef.current.find(a => a.symbol === 'ytest.usd' || a.asset === 'ytest.usd');
            const tokenAddress = assetInfo ? assetInfo.token || assetInfo.address : '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb';
            const chainId = assetInfo ? Number(assetInfo.chain_id || assetInfo.chainId) : 11155111;

            const createMsg = await createCreateChannelMessage(
                sessionSigner as any,
                {
                    chain_id: chainId,
                    token: tokenAddress as `0x${string}`
                }
            );
            
            sendMessage(JSON.parse(createMsg));

            // Funding attempt
            setTimeout(async () => {
                const currentSessionId = sessionRef.current.id;
                if (!currentSessionId) {
                    addMessage('error', 'Channel ID not set yet, please try anchoring again');
                    return;
                }
                
                addMessage('info', `Funding channel ${currentSessionId.slice(0, 8)}...`);
                const resizeMsg = await createResizeChannelMessage(
                    sessionSigner as any,
                    {
                        channel_id: currentSessionId as `0x${string}`,
                        allocate_amount: toBigInt("500", 6),
                        funds_destination: address as `0x${string}`,
                        resize_amount: BigInt(0) as any
                    }
                );
                sendMessage(JSON.parse(resizeMsg));
            }, 6000);
        } catch (e: any) {
            addMessage('error', `Anchor failed: ${e.message}`);
            setChannelStatus('none');
        }
    }, [address, authenticated, sendMessage, addMessage, toBigInt]);

    const trade = useCallback(async (amount: string) => {
        const currentId = sessionRef.current.id;
        if (!wsRef.current || !authenticated || !currentId || !address || !sessionKeyRef.current) {
            addMessage('error', `Trade blocked: No active session or not authenticated`);
            return;
        }
        
        addMessage('info', `Executing off-chain transfer: ${amount} yUSD`);
        try {
            const sessionSigner = createECDSAMessageSigner(sessionKeyRef.current.privateKey);
            
            // Resolve asset info
            const assetInfo = supportedAssetsRef.current.find(a => a.symbol === 'ytest.usd' || a.asset === 'ytest.usd');
            const assetSymbol = assetInfo ? assetInfo.symbol : 'ytest.usd';
            const recipient = '0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC';

            const transferMsg = await createTransferMessage(
                sessionSigner as any,
                {
                    destination: recipient as `0x${string}`,
                    allocations: [{
                        asset: assetSymbol,
                        amount: amount
                    }]
                }
            );
            
            sendMessage(JSON.parse(transferMsg));
        } catch (e: any) {
            addMessage('error', `Transfer failed: ${e.message}`);
        }
    }, [address, authenticated, sendMessage, addMessage]);

    const cashout = useCallback(async () => {
        const currentId = sessionRef.current.id;
        if (!wsRef.current || !authenticated || !currentId || !address) {
            addMessage('error', `Cashout blocked: No active session ID`);
            return;
        }
        
        addMessage('info', `Requesting settlement for session ${currentId.slice(0, 8)}`);
        try {
            const sessionSigner = createECDSAMessageSigner(sessionKeyRef.current.privateKey);
            const req: any = {
                req: [
                    ++messageIdRef.current,
                    'close_channel',
                    { 
                        channel_id: currentId as `0x${string}`,
                        funds_destination: address as `0x${string}`
                    },
                    Date.now()
                ]
            };

            const signature = await (sessionSigner as any)(req.req);
            req.sig = [signature];
            sendMessage(req);
        } catch (e: any) {
            addMessage('error', `Cashout request failed: ${e.message}`);
        }
    }, [authenticated, address, sendMessage, addMessage]);

    const withdraw = useCallback(async (amount: string) => {
        if (!nitroClientRef.current || !address) return;
        
        const assetInfo = supportedAssetsRef.current.find(a => a.symbol === 'ytest.usd' || a.asset === 'ytest.usd');
        const tokenAddress = assetInfo ? assetInfo.token || assetInfo.address : '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb';
        const decimals = assetInfo ? assetInfo.decimals : 6;

        addMessage('info', `Withdraw initiated for ${amount} items...`);
        try {
            // @ts-ignore
            await nitroClientRef.current.withdrawal?.(
                tokenAddress,
                toBigInt(amount, decimals)
            );
            addMessage('info', '✅ Withdrawal request pushed to chain');
        } catch (e: any) { addMessage('error', `Withdraw failed: ${e.message}`); }
    }, [address, addMessage, toBigInt]);

    // Initialization: Nitrolite Client
    useEffect(() => {
        if (isConnected && address && walletClient) {
            const pc = createPublicClient({
                chain: sepolia,
                transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
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
                    custody: '0x019B65A265EB3363822f2752141b3dF16131b262',
                    adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2',
                    tokenAddress: '0x0000000000000000000000000000000000000000',
                } as any,
                chainId: 11155111,
                challengeDuration: BigInt(3600),
            });
            addMessage('info', '🛠 Nitrolite Client initialized');
        }
    }, [isConnected, address, walletClient, addMessage]);

    return (
        <YellowContext.Provider value={{
            connected, authenticated, connecting, channelStatus, session, ledgerBalances,
            connect, anchor, trade, cashout, withdraw, messages
        }}>
            {children}
        </YellowContext.Provider>
    );
}

export function useYellow() {
    const context = useContext(YellowContext);
    if (!context) throw new Error('useYellow must be used within YellowProvider');
    return context;
}
