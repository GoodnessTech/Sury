import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  defineChain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SURY_TREASURY_ABI } from './abi.js';
import type {
  Address,
  Hash,
  SuryAgentConfig,
  AgentProfile,
  PolicyProfile,
  ProposeTaskParams,
  TaskProfile,
  ComplianceCheckResult,
  ExecutionReceipt,
  EntityStatus,
} from './types.js';

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

export class SuryAgentClient {
  public readonly publicClient: PublicClient;
  public readonly walletClient?: WalletClient;
  public readonly account?: ReturnType<typeof privateKeyToAccount>;
  public readonly treasuryAddress: Address;
  public readonly chainId: number;

  constructor(config: SuryAgentConfig = {}) {
    this.chainId = config.chainId ?? 677;
    const rpcUrl = config.rpcUrl ?? 'https://rpc.botchain.ai';
    this.treasuryAddress =
      config.treasuryAddress ?? '0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00';

    const botChain = defineChain({
      id: this.chainId,
      name: 'BOT Chain Mainnet',
      nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });

    this.publicClient = createPublicClient({
      chain: botChain,
      transport: http(rpcUrl),
    });

    if (config.privateKey) {
      this.account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: botChain,
        transport: http(rpcUrl),
      });
    }
  }

  /**
   * Get high level treasury metrics
   */
  async getTreasurySummary() {
    const res = (await this.publicClient.readContract({
      address: this.treasuryAddress,
      abi: SURY_TREASURY_ABI,
      functionName: 'getTreasurySummary',
    })) as [bigint, bigint, bigint, bigint, boolean, Address, bigint, bigint];

    return {
      balanceBot: formatEther(res[0]),
      totalDepositedBot: formatEther(res[1]),
      totalSpentBot: formatEther(res[2]),
      todaySpentBot: formatEther(res[3]),
      isPaused: res[4],
      owner: res[5],
      agentCount: Number(res[6]),
      taskCount: Number(res[7]),
    };
  }

  /**
   * Fetch agent budget, limits, and policy state
   */
  async getAgentProfile(agentId: bigint): Promise<AgentProfile> {
    const raw = (await this.publicClient.readContract({
      address: this.treasuryAddress,
      abi: SURY_TREASURY_ABI,
      functionName: 'getAgent',
      args: [agentId],
    })) as any;

    return {
      id: raw.id,
      name: raw.name,
      agentAddress: raw.agentAddress,
      assignedBudgetBot: formatEther(raw.assignedBudget),
      remainingBudgetBot: formatEther(raw.remainingBudget),
      spentBot: formatEther(raw.spent),
      dailyLimitBot: formatEther(raw.dailyLimit),
      perTransactionLimitBot: formatEther(raw.perTransactionLimit),
      policyId: raw.policyId,
      taskCount: Number(raw.taskCount),
      status: statusMap[Number(raw.status)] ?? 'active',
      dailySpentBot: formatEther(raw.dailySpent),
    };
  }

  /**
   * Fetch spending policy parameters
   */
  async getPolicy(policyId: bigint): Promise<PolicyProfile> {
    const raw = (await this.publicClient.readContract({
      address: this.treasuryAddress,
      abi: SURY_TREASURY_ABI,
      functionName: 'getPolicy',
      args: [policyId],
    })) as any;

    return {
      id: raw.id,
      agentId: raw.agentId,
      budgetBot: formatEther(raw.budget),
      perTransactionLimitBot: formatEther(raw.perTransactionLimit),
      dailyLimitBot: formatEther(raw.dailyLimit),
      approvedTokens: raw.approvedTokens,
      approvedTargets: raw.approvedTargets,
      status: statusMap[Number(raw.status)] ?? 'active',
    };
  }

  /**
   * Check whether a proposed payment complies with on-chain limits
   * before spending gas submitting a task.
   */
  async checkCompliance(params: ProposeTaskParams): Promise<ComplianceCheckResult> {
    const treasury = await this.getTreasurySummary();
    if (treasury.isPaused) {
      return {
        compliant: false,
        reason: 'Treasury is currently paused.',
        agentStatus: 'paused',
        remainingBudgetBot: '0',
        perTxLimitBot: '0',
        dailyRemainingBot: '0',
      };
    }

    const agent = await this.getAgentProfile(params.agentId);
    if (agent.status !== 'active') {
      return {
        compliant: false,
        reason: `Agent is not active (current status: ${agent.status}).`,
        agentStatus: agent.status,
        remainingBudgetBot: agent.remainingBudgetBot,
        perTxLimitBot: agent.perTransactionLimitBot,
        dailyRemainingBot: '0',
      };
    }

    const amountWei = parseEther(params.amountBot);
    const remainingBudgetWei = parseEther(agent.remainingBudgetBot);
    const perTxLimitWei = parseEther(agent.perTransactionLimitBot);
    const dailyLimitWei = parseEther(agent.dailyLimitBot);
    const dailySpentWei = parseEther(agent.dailySpentBot);

    if (amountWei > remainingBudgetWei) {
      return {
        compliant: false,
        reason: `Payment (${params.amountBot} BOT) exceeds remaining budget (${agent.remainingBudgetBot} BOT).`,
        agentStatus: agent.status,
        remainingBudgetBot: agent.remainingBudgetBot,
        perTxLimitBot: agent.perTransactionLimitBot,
        dailyRemainingBot: formatEther(dailyLimitWei > dailySpentWei ? dailyLimitWei - dailySpentWei : 0n),
      };
    }

    if (perTxLimitWei > 0n && amountWei > perTxLimitWei) {
      return {
        compliant: false,
        reason: `Payment (${params.amountBot} BOT) exceeds per-transaction limit (${agent.perTransactionLimitBot} BOT).`,
        agentStatus: agent.status,
        remainingBudgetBot: agent.remainingBudgetBot,
        perTxLimitBot: agent.perTransactionLimitBot,
        dailyRemainingBot: formatEther(dailyLimitWei > dailySpentWei ? dailyLimitWei - dailySpentWei : 0n),
      };
    }

    if (dailyLimitWei > 0n && dailySpentWei + amountWei > dailyLimitWei) {
      return {
        compliant: false,
        reason: `Payment (${params.amountBot} BOT) exceeds daily spend cap (${agent.dailyLimitBot} BOT).`,
        agentStatus: agent.status,
        remainingBudgetBot: agent.remainingBudgetBot,
        perTxLimitBot: agent.perTransactionLimitBot,
        dailyRemainingBot: formatEther(dailyLimitWei > dailySpentWei ? dailyLimitWei - dailySpentWei : 0n),
      };
    }

    // Policy target whitelist check
    if (agent.policyId > 0n) {
      const policy = await this.getPolicy(agent.policyId);
      if (
        policy.approvedTargets.length > 0 &&
        !policy.approvedTargets.some(
          (t) => t.toLowerCase() === params.destination.toLowerCase()
        )
      ) {
        return {
          compliant: false,
          reason: `Destination ${params.destination} is not whitelisted by policy #${agent.policyId}.`,
          agentStatus: agent.status,
          remainingBudgetBot: agent.remainingBudgetBot,
          perTxLimitBot: agent.perTransactionLimitBot,
          dailyRemainingBot: formatEther(dailyLimitWei > dailySpentWei ? dailyLimitWei - dailySpentWei : 0n),
        };
      }
    }

    const dailyRemaining = dailyLimitWei > dailySpentWei ? dailyLimitWei - dailySpentWei : 0n;
    return {
      compliant: true,
      agentStatus: agent.status,
      remainingBudgetBot: agent.remainingBudgetBot,
      perTxLimitBot: agent.perTransactionLimitBot,
      dailyRemainingBot: formatEther(dailyRemaining),
    };
  }

  /**
   * Submit a new payment task to SURY on behalf of the agent
   */
  async proposeTask(
    params: ProposeTaskParams
  ): Promise<{ taskId: bigint; transactionHash: Hash }> {
    if (!this.walletClient || !this.account) {
      throw new Error('WalletClient and privateKey required to propose tasks.');
    }

    const amountWei = parseEther(params.amountBot);
    const target = params.target ?? '0x0000000000000000000000000000000000000000';
    const expiry = params.expirySeconds ? BigInt(Math.floor(Date.now() / 1000) + params.expirySeconds) : 0n;

    const hash = await this.walletClient.writeContract({
      address: this.treasuryAddress,
      abi: SURY_TREASURY_ABI,
      functionName: 'createTask',
      args: [
        params.agentId,
        params.description,
        amountWei,
        '0x0000000000000000000000000000000000000000', // Native BOT
        params.destination,
        target,
        expiry,
      ],
      account: this.account,
      chain: this.walletClient.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Parse TaskCreated event from receipt logs
    let createdTaskId: bigint | undefined;
    for (const log of receipt.logs) {
      if (log.topics[1]) {
        try {
          createdTaskId = BigInt(log.topics[1]);
          break;
        } catch {
          // ignore
        }
      }
    }

    if (!createdTaskId) {
      // Fallback: query treasury task count
      const summary = await this.getTreasurySummary();
      createdTaskId = BigInt(summary.taskCount);
    }

    return {
      taskId: createdTaskId,
      transactionHash: hash,
    };
  }

  /**
   * Get task details
   */
  async getTask(taskId: bigint): Promise<TaskProfile> {
    const raw = (await this.publicClient.readContract({
      address: this.treasuryAddress,
      abi: SURY_TREASURY_ABI,
      functionName: 'getTask',
      args: [taskId],
    })) as any;

    return {
      id: raw.id,
      agentId: raw.agentId,
      description: raw.description,
      amountBot: formatEther(raw.amount),
      token: 'BOT',
      destination: raw.destination,
      target: raw.target,
      policyId: raw.policyId,
      status: statusMap[Number(raw.status)] ?? 'pending',
      createdAt: new Date(Number(raw.createdAt) * 1000),
    };
  }

  /**
   * Poll until a task is approved or rejected
   */
  async waitForApproval(
    taskId: bigint,
    timeoutMs = 60000,
    pollIntervalMs = 3000
  ): Promise<TaskProfile> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const task = await this.getTask(taskId);
      if (task.status === 'approved' || task.status === 'settled' || task.status === 'rejected') {
        return task;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(`Timeout waiting for approval on task #${taskId}`);
  }

  /**
   * Execute an approved task to trigger payment settlement from Treasury
   */
  async executeTask(taskId: bigint): Promise<ExecutionReceipt> {
    if (!this.walletClient || !this.account) {
      throw new Error('WalletClient and privateKey required to execute tasks.');
    }

    const hash = await this.walletClient.writeContract({
      address: this.treasuryAddress,
      abi: SURY_TREASURY_ABI,
      functionName: 'executeTask',
      args: [taskId],
      account: this.account,
      chain: this.walletClient.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      taskId,
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status === 'success' ? 'success' : 'reverted',
    };
  }
}
