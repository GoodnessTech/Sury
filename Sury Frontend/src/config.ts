export const botChain = {
  chainId: 677,
  name: 'BOT Chain Mainnet',
  nativeToken: 'BOT',
  rpcUrl: import.meta.env.VITE_BOT_CHAIN_RPC || 'https://rpc.botchain.ai',
  explorerUrl: import.meta.env.VITE_BOT_CHAIN_EXPLORER || 'https://scan.botchain.ai',
  contracts: {
    treasury: (import.meta.env.VITE_SURY_TREASURY_ADDRESS || '0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00') as `0x${string}`,
    factory: (import.meta.env.VITE_SURY_FACTORY_ADDRESS || '0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00') as `0x${string}`,
    policy: (import.meta.env.VITE_SURY_POLICY_ADDRESS || '0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00') as `0x${string}`,
  },
  deploymentBlock: 24021590n,
} as const;

export const navigation = [
  { id: 'overview', label: 'Overview', section: 'Workspace' },
  { id: 'treasury', label: 'Treasury', section: 'Workspace' },
  { id: 'agents', label: 'Agents', section: 'Control' },
  { id: 'policies', label: 'Policies', section: 'Control' },
  { id: 'tasks', label: 'Tasks', section: 'Operations' },
  { id: 'receipts', label: 'Receipts', section: 'Operations' },
  { id: 'activity', label: 'Activity', section: 'Operations' },
] as const;

export type RouteId = (typeof navigation)[number]['id'];
