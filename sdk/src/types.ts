export type Address = `0x${string}`;
export type Hash = `0x${string}`;

export interface SuryAgentConfig {
  privateKey?: Address;
  rpcUrl?: string;
  treasuryAddress?: Address;
  chainId?: number;
}

export type EntityStatus =
  | 'active'
  | 'paused'
  | 'pending'
  | 'approved'
  | 'settled'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface AgentProfile {
  id: bigint;
  name: string;
  agentAddress: Address;
  assignedBudgetBot: string;
  remainingBudgetBot: string;
  spentBot: string;
  dailyLimitBot: string;
  perTransactionLimitBot: string;
  policyId: bigint;
  taskCount: number;
  status: EntityStatus;
  dailySpentBot: string;
}

export interface PolicyProfile {
  id: bigint;
  agentId: bigint;
  budgetBot: string;
  perTransactionLimitBot: string;
  dailyLimitBot: string;
  approvedTokens: string[];
  approvedTargets: Address[];
  status: EntityStatus;
}

export interface ProposeTaskParams {
  agentId: bigint;
  description: string;
  amountBot: string;
  destination: Address;
  target?: Address;
  expirySeconds?: number;
}

export interface TaskProfile {
  id: bigint;
  agentId: bigint;
  description: string;
  amountBot: string;
  token: string;
  destination: Address;
  target: Address;
  policyId: bigint;
  status: EntityStatus;
  createdAt: Date;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  reason?: string;
  agentStatus: EntityStatus;
  remainingBudgetBot: string;
  perTxLimitBot: string;
  dailyRemainingBot: string;
}

export interface ExecutionReceipt {
  taskId: bigint;
  transactionHash: Hash;
  blockNumber: bigint;
  gasUsed: bigint;
  status: 'success' | 'reverted';
}
