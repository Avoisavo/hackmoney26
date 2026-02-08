"use client";

import React, { useState, useEffect } from "react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { useAccount, usePublicClient, useBalance } from "wagmi";
import { useDebounce } from "use-debounce";
import { formatEther } from "viem";
import { Search, User, CheckCircle2, XCircle, Loader2, Sparkles, Globe2, Wallet, Clock, ExternalLink } from "lucide-react";
import { useEnsAvailable, useEnsRegistration, useEnsText, ONE_YEAR_SECONDS } from "@/lib/ens";
import { ENS_CHAIN_ID } from "@/lib/networkConfig";

const DURATION_OPTIONS = [
    { label: "1 year", value: ONE_YEAR_SECONDS },
    { label: "2 years", value: ONE_YEAR_SECONDS * BigInt(2) },
    { label: "3 years", value: ONE_YEAR_SECONDS * BigInt(3) },
    { label: "5 years", value: ONE_YEAR_SECONDS * BigInt(5) },
];

export default function ENSPage() {
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<"register" | "check">("register");

    // Register section state
    const [registerName, setRegisterName] = useState("");
    const [debouncedName] = useDebounce(registerName, 500);
    const [duration, setDuration] = useState(ONE_YEAR_SECONDS);
    const [avatarUrl, setAvatarUrl] = useState("");

    // Check wallet section state
    const [walletNames, setWalletNames] = useState<string[]>([]);
    const [isLoadingNames, setIsLoadingNames] = useState(false);
    const [primaryName, setPrimaryName] = useState<string | null>(null);
    const [primaryAvatar, setPrimaryAvatar] = useState<string | null>(null);

    const { address, isConnected, chainId } = useAccount();
    const publicClient = usePublicClient();
    const { data: balance, isLoading: isBalanceLoading } = useBalance({
        address: address,
    });

    // ENS Hooks
    const { data: available, isLoading: isChecking } = useEnsAvailable(debouncedName);

    const {
        step,
        price,
        isPriceLoading,
        countdown,
        commitTxHash,
        registerTxHash,
        error,
        startRegistration,
        completeRegistration,
        reset,
    } = useEnsRegistration({ name: debouncedName, duration, avatar: avatarUrl });

    const isWrongNetwork = chainId !== ENS_CHAIN_ID;
    const canStartRegistration = debouncedName && debouncedName.length >= 3 && available && !isWrongNetwork && address;
    const formattedPrice = price ? formatEther(price) : null;

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    // Dispatch event to update header instantly on success
    useEffect(() => {
        if (step === "success" && debouncedName) {
            const fullName = `${debouncedName}.eth`;
            window.dispatchEvent(new CustomEvent("ens-registered", {
                detail: {
                    name: fullName,
                    avatar: avatarUrl
                }
            }));
            setPrimaryName(fullName);
            setPrimaryAvatar(avatarUrl);
            setWalletNames(prev => prev.includes(fullName) ? prev : [fullName, ...prev]);
        }
    }, [step, debouncedName, avatarUrl]);

    // Use useEnsText hook to fetch avatar from resolver directly
    const { data: resolverAvatar } = useEnsText(primaryName, 'avatar');

    // Sync resolver avatar to state when available
    useEffect(() => {
        if (resolverAvatar && resolverAvatar !== primaryAvatar) {
            setPrimaryAvatar(resolverAvatar);
        }
    }, [resolverAvatar, primaryAvatar]);

    // Lookup primary ENS name when wallet connects
    useEffect(() => {
        const lookupPrimaryName = async () => {
            if (address && publicClient) {
                setIsLoadingNames(true);
                try {
                    const name = await publicClient.getEnsName({ address });
                    setPrimaryName(name || null);
                    if (name) {
                        setWalletNames([name]);
                    }
                } catch (error) {
                    console.error("Error looking up ENS name:", error);
                }
                setIsLoadingNames(false);
            }
        };

        lookupPrimaryName();
    }, [address, publicClient]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center">
                <div className="relative">
                    <div className="w-12 h-12 border border-border-default border-t-accent-green animate-spin rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-tighter text-text-primary">
                        ENS
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <main className="w-full">
                <GlobalHeader />

                <div className="max-w-[1200px] mx-auto px-8 py-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    {/* Page Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 mb-6">
                            <Globe2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-semibold text-emerald-600">Ethereum Name Service</span>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Your Web3 Identity
                        </h1>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            Register your .eth name and manage your decentralized identity on Ethereum
                        </p>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex justify-center items-center gap-4 mb-10">
                        <div className="inline-flex bg-gray-100 rounded-full p-1.5">
                            <button
                                onClick={() => setActiveSection("register")}
                                className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeSection === "register"
                                    ? "bg-white text-gray-900 shadow-md"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Register Name
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveSection("check")}
                                className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeSection === "check"
                                    ? "bg-white text-gray-900 shadow-md"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    My Names
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Wrong Network Warning */}
                    {isWrongNetwork && isConnected && (
                        <div className="max-w-2xl mx-auto mb-6">
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-yellow-800 text-center">
                                <p className="font-semibold">⚠️ Please switch to Sepolia network to register ENS names</p>
                            </div>
                        </div>
                    )}

                    {/* Register Section */}
                    {activeSection === "register" && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl border border-gray-100 shadow-xl p-8">

                                {/* Success State */}
                                {step === "success" && (
                                    <div className="text-center space-y-4 py-8">
                                        <div className="text-6xl mb-4">🎉</div>
                                        <h3 className="text-2xl font-bold text-emerald-600">
                                            Congratulations!
                                        </h3>
                                        <p className="text-gray-600 text-lg">
                                            You are now the owner of <span className="font-bold text-gray-900">{debouncedName}.eth</span>
                                        </p>
                                        {registerTxHash && (
                                            <a
                                                href={`https://sepolia.etherscan.io/tx/${registerTxHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                                            >
                                                View transaction <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                        <button
                                            onClick={reset}
                                            className="mt-6 px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                        >
                                            Register another name
                                        </button>
                                    </div>
                                )}

                                {/* Error State */}
                                {step === "error" && (
                                    <div className="text-center space-y-4 py-8">
                                        <div className="text-5xl mb-4">⚠️</div>
                                        <h3 className="text-2xl font-bold text-red-600">
                                            Registration Failed
                                        </h3>
                                        <p className="text-gray-600">
                                            {error?.message || "An error occurred during registration"}
                                        </p>
                                        <button
                                            onClick={reset}
                                            className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}

                                {/* Main Registration Form */}
                                {step !== "success" && step !== "error" && (
                                    <>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Register a .eth Name</h2>
                                        <p className="text-gray-500 mb-8">Search for your unique Ethereum name</p>

                                        {/* Search Input */}
                                        <div className="relative mb-6">
                                            <div className="flex gap-3">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <input
                                                        type="text"
                                                        value={registerName}
                                                        onChange={(e) => setRegisterName(e.target.value.toLowerCase().replace(".eth", "").replace(/[^a-z0-9-]/g, ""))}
                                                        placeholder="Search for a name"
                                                        disabled={step !== "idle"}
                                                        className="w-full h-14 pl-12 pr-20 bg-white border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">.eth</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Avatar URL Input */}
                                        <div className="relative mb-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Avatar Image URL (Optional)
                                            </label>
                                            <div className="relative">
                                                <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                <input
                                                    type="text"
                                                    value={avatarUrl}
                                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                                    placeholder="https://example.com/image.png"
                                                    disabled={step !== "idle"}
                                                    className="w-full h-12 pl-12 pr-4 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Availability Status */}
                                        {debouncedName && debouncedName.length >= 3 && step === "idle" && (
                                            <div className="mb-6 flex items-center justify-center gap-2 h-8">
                                                {isChecking ? (
                                                    <span className="text-gray-400 flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Checking availability...
                                                    </span>
                                                ) : available ? (
                                                    <span className="text-emerald-600 font-semibold flex items-center gap-2">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                        {debouncedName}.eth is available!
                                                    </span>
                                                ) : (
                                                    <span className="text-red-500 font-semibold flex items-center gap-2">
                                                        <XCircle className="w-5 h-5" />
                                                        {debouncedName}.eth is taken
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Duration Selector */}
                                        {step === "idle" && available && (
                                            <div className="mb-6">
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Registration Period
                                                </label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {DURATION_OPTIONS.map((option) => (
                                                        <button
                                                            key={option.label}
                                                            onClick={() => setDuration(option.value)}
                                                            className={`py-3 px-4 text-sm rounded-xl font-bold transition-all ${duration === option.value
                                                                ? "bg-emerald-500 text-white shadow-lg"
                                                                : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
                                                                }`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Price Display */}
                                        {available && step === "idle" && (
                                            <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-gray-600">Registration Cost</span>
                                                    <span className="font-bold text-xl text-gray-900">
                                                        {isPriceLoading ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : formattedPrice ? (
                                                            `${parseFloat(formattedPrice).toFixed(6)} ETH`
                                                        ) : (
                                                            "..."
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    + estimated gas fee • 5% buffer included for price fluctuations
                                                </p>
                                            </div>
                                        )}

                                        {/* Step 1: Committing */}
                                        {step === "committing" && (
                                            <div className="mb-6 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                                <p className="text-blue-800 font-bold text-lg">Step 1 of 2: Submitting commitment...</p>
                                                <p className="text-blue-600 mt-2">Please confirm in your wallet</p>
                                                {commitTxHash && (
                                                    <a
                                                        href={`https://sepolia.etherscan.io/tx/${commitTxHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mt-3"
                                                    >
                                                        View transaction <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Step 2: Waiting */}
                                        {step === "waiting" && (
                                            <div className="mb-6 p-6 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                                                <Clock className="w-10 h-10 text-amber-600 mx-auto mb-4" />
                                                <p className="text-amber-800 font-bold text-lg">
                                                    Waiting {countdown} seconds...
                                                </p>
                                                <p className="text-amber-600 mt-2">
                                                    This prevents front-running attacks
                                                </p>
                                                <div className="mt-4 w-full bg-amber-200 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="bg-amber-500 h-3 rounded-full transition-all duration-1000"
                                                        style={{ width: `${((60 - countdown) / 60) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 3: Registering */}
                                        {step === "registering" && (
                                            <div className="mb-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
                                                <p className="text-emerald-800 font-bold text-lg">Step 2 of 2: Completing registration...</p>
                                                <p className="text-emerald-600 mt-2">Please confirm payment in your wallet</p>
                                                {registerTxHash && (
                                                    <a
                                                        href={`https://sepolia.etherscan.io/tx/${registerTxHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-sm mt-3"
                                                    >
                                                        View transaction <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        {step === "idle" && (
                                            <button
                                                onClick={startRegistration}
                                                disabled={!canStartRegistration || isChecking || isPriceLoading}
                                                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                            >
                                                {!isConnected ? "Connect Wallet to Register" : "Begin Registration"}
                                            </button>
                                        )}

                                        {step === "waiting" && countdown === 0 && (
                                            <button
                                                onClick={completeRegistration}
                                                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            >
                                                Complete Registration ({formattedPrice ? parseFloat(formattedPrice).toFixed(6) : "..."} ETH)
                                            </button>
                                        )}

                                        {/* Cancel/Reset during process */}
                                        {(step === "committing" || step === "waiting" || step === "registering") && (
                                            <button
                                                onClick={reset}
                                                className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors mt-4"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* Info Cards */}
                                {step === "idle" && !available && (
                                    <div className="grid grid-cols-3 gap-4 mt-8">
                                        <div className="p-4 bg-blue-50 rounded-xl text-center">
                                            <div className="text-2xl mb-2">🔒</div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-1">Secure</h4>
                                            <p className="text-xs text-gray-500">Cryptographically secured ownership</p>
                                        </div>
                                        <div className="p-4 bg-purple-50 rounded-xl text-center">
                                            <div className="text-2xl mb-2">🌐</div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-1">Universal</h4>
                                            <p className="text-xs text-gray-500">Works across all Web3 platforms</p>
                                        </div>
                                        <div className="p-4 bg-amber-50 rounded-xl text-center">
                                            <div className="text-2xl mb-2">✨</div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-1">Yours Forever</h4>
                                            <p className="text-xs text-gray-500">Decentralized ownership</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Check Wallet Names Section */}
                    {activeSection === "check" && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl border border-gray-100 shadow-xl p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">My ENS Names</h2>
                                <p className="text-gray-500 mb-8">View and manage your registered names</p>

                                {!isConnected ? (
                                    <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <User className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
                                        <p className="text-gray-500 max-w-sm mx-auto">
                                            Connect your wallet to view your ENS names and manage your Web3 identity
                                        </p>
                                    </div>
                                ) : isLoadingNames ? (
                                    <div className="text-center py-16">
                                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                                        <p className="text-gray-500">Loading your names...</p>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Connected Wallet Info */}
                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6 border border-emerald-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center overflow-hidden">
                                                    {primaryAvatar ? (
                                                        <img src={primaryAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-white font-bold text-xl">
                                                            {primaryName ? primaryName[0].toUpperCase() : address?.[2]?.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`text-lg font-bold ${primaryName ? 'text-gray-900' : 'text-gray-400'}`}>
                                                            {primaryName || "Not Available"}
                                                        </h3>
                                                        {primaryName && (
                                                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-full tracking-wider">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-mono bg-white/50 px-2 py-0.5 rounded border border-emerald-100/50 inline-block w-fit">
                                                        {address}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Names List */}
                                        {walletNames.length > 0 ? (
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    Your Names
                                                </h4>
                                                {walletNames.map((name, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                                                                <Globe2 className="w-6 h-6 text-white" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900">{name}</h4>
                                                                <p className="text-sm text-gray-500">Expires in 365 days</p>
                                                            </div>
                                                        </div>
                                                        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors">
                                                            Manage
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                                <div className="text-4xl mb-4">🔍</div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-2">No Names Found</h3>
                                                <p className="text-gray-500 max-w-sm mx-auto mb-6">
                                                    You don&apos;t have any ENS names registered to this wallet yet
                                                </p>
                                                <button
                                                    onClick={() => setActiveSection("register")}
                                                    className="px-6 py-3 bg-[#00C896] hover:bg-[#00B085] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                                                >
                                                    Register Your First Name
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-8 pb-12 pt-8">
                        <p className="text-[10px] text-text-secondary font-medium italic opacity-50 border-t border-gray-100 pt-6 text-center">
                            Xiphias Lab Protocol Node 842 / ENS Integration Layer.
                            Archive synchronized: {new Date().toLocaleDateString()}.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
