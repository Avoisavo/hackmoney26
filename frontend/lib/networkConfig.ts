import { sepolia } from "wagmi/chains";

export const chains = [sepolia] as const;
export const ENS_CHAIN_ID = sepolia.id; // 11155111

// ENS Registry address on Sepolia
export const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as `0x${string}`;

// ENS ETHRegistrarController on Sepolia
export const ETH_REGISTRAR_CONTROLLER_ADDRESS = "0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968" as `0x${string}`;

// ENS Public Resolver on Sepolia
export const ENS_PUBLIC_RESOLVER_ADDRESS = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5" as `0x${string}`;

// ENS NameWrapper on Sepolia
export const NAME_WRAPPER_ADDRESS = "0x0635513f179D50A207757E05759CbD106d7dFcE8" as `0x${string}`;
