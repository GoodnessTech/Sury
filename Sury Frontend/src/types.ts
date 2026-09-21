export type Address = `0x${string}`;

export type WalletConnectionStatus = 'disconnected' | 'connected' | 'wrong-network' | 'switching';
export type TransactionStatus = 'idle' | 'awaiting-signature' | 'submitted' | 'pending' | 'confirmed' | 'failed' | 'rejected' | 'wrong-network' | 'insufficient-gas';
export type EntityStatus = 'active' | 'paused' | 'pending' | 'approved' | 'executing' | 'settled' | 'rejected' | 'expired' | 'cancelled';

export interface WalletState {
  status: WalletConnectionStatus;
  address?: Address;
  chainId?: number;
  balance?: string;
  symbol?: string;
}

export interface TransactionState {
  status: TransactionStatus;
  hash?: Address;
  error?: string;
}

export interface Treasury {
  id: string;
  balance: string;
  availableBalance: string;
  totalDeposited: string;
  totalSpent: string;
  todaySpent: string;
  status: EntityStatus;
}

export interface Agent {
  id: string;
  name: string;
  address: Address;
  status: EntityStatus;
  assignedBudget: string;
  remainingBudget: string;
  spent: string;
  dailyLimit: string;
  perTransactionLimit: string;
  policyId?: string;
  taskCount: number;
  lastActivity?: string;
}

export interface Policy {
  id: string;
  agentId: string;
  budget: string;
  perTransactionLimit: string;
  dailyLimit: string;
  approvedTokens: string[];
  approvedTargets: Address[];
  expiry?: string;
  status: EntityStatus;
}

export interface Task {
  id: string;
  agentId: string;
  description: string;
  amount: string;
  token: string;
  destination: Address;
  target?: Address;
  policyId: string;
  status: EntityStatus;
  createdAt: string;
  expiry?: string;
}

export interface Payment {
  id: string;
  taskId: string;
  amount: string;
  token: string;
  recipient: Address;
  status: EntityStatus;
  transactionHash?: Address;
}

export interface Receipt {
  id: string;
  taskId: string;
  agentId: string;
  treasuryId: string;
  amount: string;
  token: string;
  recipient: Address;
  timestamp: string;
  policyId: string;
  transactionHash: Address;
}

export interface Activity {
  id: string;
  type: string;
  label: string;
  status: EntityStatus;
  createdAt: string;
  transactionHash?: Address;
}

export interface SuryDataProvider {
  getTreasury(): Promise<Treasury | null>;
  getAgents(): Promise<Agent[]>;
  getPolicies(): Promise<Policy[]>;
  getTasks(): Promise<Task[]>;
  getPayments(): Promise<Payment[]>;
  getReceipts(): Promise<Receipt[]>;
  getActivity(): Promise<Activity[]>;
}
