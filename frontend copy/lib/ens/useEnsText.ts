import { useReadContract } from 'wagmi';
import { namehash } from 'viem';
import { ENS_PUBLIC_RESOLVER_ADDRESS, ENS_CHAIN_ID } from '../networkConfig';

const PUBLIC_RESOLVER_ABI = [
    {
        inputs: [
            { name: 'node', type: 'bytes32' },
            { name: 'key', type: 'string' }
        ],
        name: 'text',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

/**
 * Hook to read a text record directly from the ENS Public Resolver on Sepolia.
 * This bypasses the standard getEnsAvatar which may not work correctly on testnets.
 */
export const useEnsText = (name: string | null | undefined, key: string) => {
    const node = name ? namehash(name) : undefined;

    return useReadContract({
        address: ENS_PUBLIC_RESOLVER_ADDRESS,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: 'text',
        args: node ? [node, key] : undefined,
        chainId: ENS_CHAIN_ID,
        query: {
            enabled: Boolean(node),
        }
    });
};
