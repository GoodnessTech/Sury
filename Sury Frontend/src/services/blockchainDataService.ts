import { createPublicClient, http, formatEther, defineChain } from 'viem';
import { botChain } from '@/config';
import { SURY_TREASURY_ABI } from '@/contracts/SuryTreasuryABI';
import type {
  SuryDataProvider,
  Treasury,
  Agent,
  Policy,
  Task,
  Payment,
  Receipt,
  Activity,
  EntityStatus,
  Address,
} from '@/types';

// Define BOT Chain Mainnet for viem
export const botChainNetwork = defineChain({
  id: botChain.chainId,
  name: botChain.name,
  nativeCurrency: {
    name: botChain.nativeToken,
    symbol: botChain.nativeToken,
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [botChain.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'BOT Chain Explorer', url: botChain.explorerUrl },
  },
});

export const publicClient = createPublicClient({
  chain: botChainNetwork,
  transport: http(botChain.rpcUrl),
});

const statusMap: Record<number, EntityStatus> = {
  0: 'active',
  1: 'paused',
  2: 'pending',
  3: 'approved',
  4: 'settled',
  5: 'rejected',
  6: 'expired',
  7: 'cancelled',
};

class BlockchainDataProvider implements SuryDataProvider {
  private treasuryAddress = botChain.contracts.treasury;

  async getTreasury(): Promise<Treasury | null> {
    try {
      const summary = (await publicClient.readContract({
        address: this.treasuryAddress,
        abi: SURY_TREASURY_ABI,
        functionName: 'getTreasurySummary',
      })) as [bigint, bigint, bigint, bigint, boolean, Address, bigint, bigint];

      const [balance, deposited, spent, todaySpend, isPaused] = summary;

      // Available balance is the remaining unspent treasury balance
      const availableBalance = balance;

      return {
        id: this.treasuryAddress,
        balance: parseFloat(formatEther(balance)).toFixed(4),
        availableBalance: parseFloat(formatEther(availableBalance)).toFixed(4),
        totalDeposited: parseFloat(formatEther(deposited)).toFixed(4),
        totalSpent: parseFloat(formatEther(spent)).toFixed(4),
        todaySpent: parseFloat(formatEther(todaySpend)).toFixed(4),
        status: isPaused ? 'paused' : 'active',
      };
    } catch (err) {
      console.error('Failed to read treasury from BOT Chain:', err);
      return null;
    }
  }

  async getAgents(): Promise<Agent[]> {
    try {
      const list = (await publicClient.readContract({
        address: this.treasuryAddress,
        abi: SURY_TREASURY_ABI,
        functionName: 'getAgents',
      })) as any[];

      return list.map((a) => ({
        id: String(a.id),
        name: a.name,
        address: a.agentAddress,
        status: statusMap[Number(a.status)] || 'active',
        assignedBudget: parseFloat(formatEther(a.assignedBudget)).toFixed(4),
        remainingBudget: parseFloat(formatEther(a.remainingBudget)).toFixed(4),
        spent: parseFloat(formatEther(a.spent)).toFixed(4),
        dailyLimit: parseFloat(formatEther(a.dailyLimit)).toFixed(4),
        perTransactionLimit: parseFloat(formatEther(a.perTransactionLimit)).toFixed(4),
        policyId: a.policyId > 0n ? String(a.policyId) : undefined,
        taskCount: Number(a.taskCount),
      }));
    } catch (err) {
      console.error('Failed to read agents from BOT Chain:', err);
      return [];
    }
  }

  async getPolicies(): Promise<Policy[]> {
    try {
      const list = (await publicClient.readContract({
        address: this.treasuryAddress,
        abi: SURY_TREASURY_ABI,
        functionName: 'getPolicies',
      })) as any[];

      return list.map((p) => ({
        id: String(p.id),
        agentId: String(p.agentId),
        budget: parseFloat(formatEther(p.budget)).toFixed(4),
        perTransactionLimit: parseFloat(formatEther(p.perTransactionLimit)).toFixed(4),
        dailyLimit: parseFloat(formatEther(p.dailyLimit)).toFixed(4),
        approvedTokens: (p.approvedTokens as string[]).map((t) =>
          t.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? 'BOT' : t
        ),
        approvedTargets: p.approvedTargets as Address[],
        expiry: p.expiry > 0n ? new Date(Number(p.expiry) * 1000).toLocaleDateString() : undefined,
        status: statusMap[Number(p.status)] || 'active',
      }));
    } catch (err) {
      console.error('Failed to read policies from BOT Chain:', err);
      return [];
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      const list = (await publicClient.readContract({
        address: this.treasuryAddress,
        abi: SURY_TREASURY_ABI,
        functionName: 'getTasks',
      })) as any[];

      return list
        .map((t) => ({
          id: String(t.id),
          agentId: String(t.agentId),
          description: t.description,
          amount: parseFloat(formatEther(t.amount)).toFixed(4),
          token: 'BOT',
          destination: t.destination,
          target: t.target,
          policyId: String(t.policyId),
          status: statusMap[Number(t.status)] || 'pending',
          createdAt: new Date(Number(t.createdAt) * 1000).toLocaleString(),
          expiry: t.expiry > 0n ? new Date(Number(t.expiry) * 1000).toLocaleDateString() : undefined,
        }))
        .reverse(); // Most recent first
    } catch (err) {
      console.error('Failed to read tasks from BOT Chain:', err);
      return [];
    }
  }

  async getPayments(): Promise<Payment[]> {
    const tasks = await this.getTasks();
    return tasks
      .filter((t) => t.status === 'settled' || t.status === 'executing')
      .map((t) => ({
        id: t.id,
        taskId: t.id,
        amount: t.amount,
        token: t.token,
        recipient: t.destination,
        status: t.status,
      }));
  }

  async getReceipts(): Promise<Receipt[]> {
    try {
      const logs = await publicClient.getContractEvents({
        address: this.treasuryAddress,
        abi: SURY_TREASURY_ABI,
        eventName: 'PaymentExecuted',
        fromBlock: botChain.deploymentBlock,
      });

      return logs
        .map((log: any) => {
          const args = log.args as any;
          return {
            id: `rcpt-${args.taskId.toString()}`,
            taskId: `Task #${args.taskId.toString()}`,
            agentId: `Agent #${args.agentId.toString()}`,
            treasuryId: `Treasury (${this.treasuryAddress.slice(0, 8)}...)`,
            amount: parseFloat(formatEther(args.amount)).toFixed(4),
            token: 'BOT',
            recipient: args.recipient,
            timestamp: new Date(Number(args.timestamp) * 1000).toLocaleString(),
            policyId: `Policy #${args.agentId.toString()}`,
            transactionHash: log.transactionHash,
          };
        })
        .reverse();
    } catch (err) {
      console.error('Failed to query receipts from BOT Chain:', err);
      return [];
    }
  }

  async getActivity(): Promise<Activity[]> {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 2000n ? currentBlock - 2000n : botChain.deploymentBlock;

      const [fundLogs, agentLogs, taskLogs, approvedLogs, paymentLogs] = await Promise.all([
        publicClient.getContractEvents({
          address: this.treasuryAddress,
          abi: SURY_TREASURY_ABI,
          eventName: 'TreasuryFunded',
          fromBlock,
        }),
        publicClient.getContractEvents({
          address: this.treasuryAddress,
          abi: SURY_TREASURY_ABI,
          eventName: 'AgentCreated',
          fromBlock,
        }),
        publicClient.getContractEvents({
          address: this.treasuryAddress,
          abi: SURY_TREASURY_ABI,
          eventName: 'TaskCreated',
          fromBlock,
        }),
        publicClient.getContractEvents({
          address: this.treasuryAddress,
          abi: SURY_TREASURY_ABI,
          eventName: 'TaskApproved',
          fromBlock,
        }),
        publicClient.getContractEvents({
          address: this.treasuryAddress,
          abi: SURY_TREASURY_ABI,
          eventName: 'PaymentExecuted',
          fromBlock,
        }),
      ]);

      const activities: Activity[] = [];

      fundLogs.forEach((l: any) => {
        activities.push({
          id: `fund-${l.transactionHash}-${l.logIndex}`,
          type: 'TreasuryFunded',
          label: `Treasury funded with ${parseFloat(formatEther(l.args.amount)).toFixed(4)} BOT`,
          status: 'active',
          createdAt: new Date(Number(l.args.timestamp) * 1000).toLocaleTimeString(),
          transactionHash: l.transactionHash,
        });
      });

      agentLogs.forEach((l: any) => {
        activities.push({
          id: `agent-${l.transactionHash}-${l.logIndex}`,
          type: 'AgentCreated',
          label: `Agent created: "${l.args.name}" (ID #${l.args.agentId})`,
          status: 'active',
          createdAt: new Date(Number(l.args.timestamp) * 1000).toLocaleTimeString(),
          transactionHash: l.transactionHash,
        });
      });

      taskLogs.forEach((l: any) => {
        activities.push({
          id: `task-${l.transactionHash}-${l.logIndex}`,
          type: 'TaskCreated',
          label: `Task #${l.args.taskId} created: "${l.args.description}" (${parseFloat(formatEther(l.args.amount)).toFixed(4)} BOT)`,
          status: 'pending',
          createdAt: new Date(Number(l.args.timestamp) * 1000).toLocaleTimeString(),
          transactionHash: l.transactionHash,
        });
      });

      approvedLogs.forEach((l: any) => {
        activities.push({
          id: `appr-${l.transactionHash}-${l.logIndex}`,
          type: 'TaskApproved',
          label: `Task #${l.args.taskId} approved for execution`,
          status: 'approved',
          createdAt: new Date(Number(l.args.timestamp) * 1000).toLocaleTimeString(),
          transactionHash: l.transactionHash,
        });
      });

      paymentLogs.forEach((l: any) => {
        activities.push({
          id: `pay-${l.transactionHash}-${l.logIndex}`,
          type: 'PaymentExecuted',
          label: `Payment settled for Task #${l.args.taskId} (${parseFloat(formatEther(l.args.amount)).toFixed(4)} BOT)`,
          status: 'settled',
          createdAt: new Date(Number(l.args.timestamp) * 1000).toLocaleTimeString(),
          transactionHash: l.transactionHash,
        });
      });

      return activities.reverse();
    } catch (err) {
      console.error('Failed to read activity feed from BOT Chain:', err);
      return [];
    }
  }
}

export const blockchainDataProvider: SuryDataProvider = new BlockchainDataProvider();
