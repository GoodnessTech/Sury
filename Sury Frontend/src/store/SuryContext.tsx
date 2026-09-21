import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type {
  WalletState,
  TransactionState,
  Treasury,
  Agent,
  Policy,
  Task,
  Receipt,
  Activity,
  SuryDataProvider,
  Address,
} from '@/types';
import { walletService } from '@/services/walletService';
import { blockchainDataProvider } from '@/services/blockchainDataService';
import { useToast } from '@/components/Toast';

interface ActionResponse {
  success: boolean;
  hash?: Address;
  error?: string;
}

interface SuryContextValue {
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  tx: TransactionState;
  clearTx: () => void;
  dataProvider: SuryDataProvider;
  treasury: Treasury | null;
  agents: Agent[];
  policies: Policy[];
  tasks: Task[];
  receipts: Receipt[];
  activity: Activity[];
  loading: Record<string, boolean>;
  refresh: (key?: string) => Promise<void>;
  depositTreasury: (amountBot: string) => Promise<ActionResponse>;
  withdrawTreasury: (amountBot: string, recipient: Address) => Promise<ActionResponse>;
  pauseTreasury: () => Promise<ActionResponse>;
  unpauseTreasury: () => Promise<ActionResponse>;
  createAgent: (
    name: string,
    agentAddress: Address,
    budgetBot: string,
    dailyLimitBot: string,
    perTxLimitBot: string
  ) => Promise<ActionResponse>;
  pauseAgent: (agentId: string) => Promise<ActionResponse>;
  unpauseAgent: (agentId: string) => Promise<ActionResponse>;
  createPolicy: (
    agentId: string,
    budgetBot: string,
    perTxLimitBot: string,
    dailyLimitBot: string,
    targets: Address[]
  ) => Promise<ActionResponse>;
  pausePolicy: (policyId: string) => Promise<ActionResponse>;
  createTask: (
    agentId: string,
    description: string,
    amountBot: string,
    destination: Address
  ) => Promise<ActionResponse>;
  approveTask: (taskId: string) => Promise<ActionResponse>;
  rejectTask: (taskId: string) => Promise<ActionResponse>;
  executeTask: (taskId: string) => Promise<ActionResponse>;
}

const Ctx = createContext<SuryContextValue | null>(null);

export function SuryProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [wallet, setWallet] = useState<WalletState>({ status: 'disconnected' });
  const [tx, setTx] = useState<TransactionState>({ status: 'idle' });
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Production provider reads real blockchain state from BOT Chain Mainnet
  const dataProvider = blockchainDataProvider;

  const refresh = useCallback(
    async (key?: string) => {
      const keys = key
        ? [key]
        : ['treasury', 'agents', 'policies', 'tasks', 'receipts', 'activity'];
      for (const k of keys) {
        setLoading((prev) => ({ ...prev, [k]: true }));
      }
      try {
        if (keys.includes('treasury')) setTreasury(await dataProvider.getTreasury());
        if (keys.includes('agents')) setAgents(await dataProvider.getAgents());
        if (keys.includes('policies')) setPolicies(await dataProvider.getPolicies());
        if (keys.includes('tasks')) setTasks(await dataProvider.getTasks());
        if (keys.includes('receipts')) setReceipts(await dataProvider.getReceipts());
        if (keys.includes('activity')) setActivity(await dataProvider.getActivity());
      } catch (err) {
        console.error('Error refreshing live data:', err);
      } finally {
        const cleared: Record<string, boolean> = {};
        keys.forEach((k) => {
          cleared[k] = false;
        });
        setLoading((prev) => ({ ...prev, ...cleared }));
      }
    },
    [dataProvider]
  );

  useEffect(() => {
    const unsubWallet = walletService.onWalletChange(setWallet);
    const unsubTx = walletService.onTxChange(setTx);
    setWallet(walletService.getWalletState());
    
    // Initial fetch from BOT Chain
    refresh();

    // Periodic live sync from BOT Chain Mainnet every 15s
    const timer = setInterval(() => {
      refresh();
    }, 15000);

    return () => {
      unsubWallet();
      unsubTx();
      clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (wallet.status === 'connected') {
      refresh();
    }
  }, [wallet.status, refresh]);

  const connectWallet = useCallback(async () => {
    try {
      await walletService.connect();
    } catch {
      setWallet({ status: 'disconnected' });
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    await walletService.disconnect();
  }, []);

  const switchNetwork = useCallback(async () => {
    await walletService.switchToBotChain();
  }, []);

  const clearTx = useCallback(() => setTx({ status: 'idle' }), []);

  // --- Write Protocol Methods with Toast Notifications ---

  const depositTreasury = useCallback(
    async (amountBot: string): Promise<ActionResponse> => {
      showToast({ type: 'info', title: 'Transaction Submitted', message: `Depositing ${amountBot} BOT into Treasury...` });
      const res = await walletService.depositTreasury(amountBot);
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Deposit Confirmed', message: `Funded ${amountBot} BOT successfully`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Deposit Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const withdrawTreasury = useCallback(
    async (amountBot: string, recipient: Address): Promise<ActionResponse> => {
      showToast({ type: 'info', title: 'Transaction Submitted', message: `Withdrawing ${amountBot} BOT...` });
      const res = await walletService.withdrawTreasury(amountBot, recipient);
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Withdrawal Confirmed', message: `Transferred ${amountBot} BOT`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Withdrawal Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const pauseTreasury = useCallback(async (): Promise<ActionResponse> => {
    showToast({ type: 'warning', title: 'Emergency Control', message: 'Pausing treasury operations...' });
    const res = await walletService.pauseTreasury();
    if (res.confirmed) {
      showToast({ type: 'success', title: 'Treasury Paused', message: 'Protocol spending is paused', txHash: res.hash });
      await refresh('treasury');
    } else {
      showToast({ type: 'error', title: 'Pause Failed', message: res.error });
    }
    return { success: res.confirmed, hash: res.hash, error: res.error };
  }, [refresh, showToast]);

  const unpauseTreasury = useCallback(async (): Promise<ActionResponse> => {
    showToast({ type: 'info', title: 'Emergency Control', message: 'Unpausing treasury...' });
    const res = await walletService.unpauseTreasury();
    if (res.confirmed) {
      showToast({ type: 'success', title: 'Treasury Resumed', message: 'Protocol operations active', txHash: res.hash });
      await refresh('treasury');
    } else {
      showToast({ type: 'error', title: 'Unpause Failed', message: res.error });
    }
    return { success: res.confirmed, hash: res.hash, error: res.error };
  }, [refresh, showToast]);

  const createAgent = useCallback(
    async (
      name: string,
      agentAddress: Address,
      budgetBot: string,
      dailyLimitBot: string,
      perTxLimitBot: string
    ): Promise<ActionResponse> => {
      showToast({ type: 'info', title: 'Agent Registration', message: `Registering agent "${name}" on-chain...` });
      const res = await walletService.createAgent(
        name,
        agentAddress,
        budgetBot,
        dailyLimitBot,
        perTxLimitBot
      );
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Agent Registered', message: `Agent "${name}" active on BOT Chain`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Agent Registration Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const pauseAgent = useCallback(
    async (agentId: string): Promise<ActionResponse> => {
      const res = await walletService.pauseAgent(BigInt(agentId));
      if (res.confirmed) {
        showToast({ type: 'warning', title: 'Agent Paused', message: `Agent #${agentId} paused`, txHash: res.hash });
        await refresh('agents');
      } else {
        showToast({ type: 'error', title: 'Failed to Pause Agent', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const unpauseAgent = useCallback(
    async (agentId: string): Promise<ActionResponse> => {
      const res = await walletService.unpauseAgent(BigInt(agentId));
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Agent Resumed', message: `Agent #${agentId} reactivated`, txHash: res.hash });
        await refresh('agents');
      } else {
        showToast({ type: 'error', title: 'Failed to Resume Agent', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const createPolicy = useCallback(
    async (
      agentId: string,
      budgetBot: string,
      perTxLimitBot: string,
      dailyLimitBot: string,
      targets: Address[]
    ): Promise<ActionResponse> => {
      showToast({ type: 'info', title: 'Policy Creation', message: `Configuring spending policy for Agent #${agentId}...` });
      const res = await walletService.createPolicy(
        BigInt(agentId),
        budgetBot,
        perTxLimitBot,
        dailyLimitBot,
        targets
      );
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Policy Attached', message: `Policy attached to Agent #${agentId}`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Policy Creation Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const pausePolicy = useCallback(
    async (policyId: string): Promise<ActionResponse> => {
      const res = await walletService.pausePolicy(BigInt(policyId));
      if (res.confirmed) {
        showToast({ type: 'warning', title: 'Policy Paused', message: `Policy #${policyId} paused`, txHash: res.hash });
        await refresh('policies');
      } else {
        showToast({ type: 'error', title: 'Failed to Pause Policy', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const createTask = useCallback(
    async (
      agentId: string,
      description: string,
      amountBot: string,
      destination: Address
    ): Promise<ActionResponse> => {
      showToast({ type: 'info', title: 'Task Proposal', message: `Proposing task for ${amountBot} BOT...` });
      const res = await walletService.createTask(
        BigInt(agentId),
        description,
        amountBot,
        destination
      );
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Task Proposed', message: `Task submitted for approval`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Task Creation Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const approveTask = useCallback(
    async (taskId: string): Promise<ActionResponse> => {
      showToast({ type: 'info', title: 'Approving Task', message: `Authorizing Task #${taskId}...` });
      const res = await walletService.approveTask(BigInt(taskId));
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Task Approved', message: `Task #${taskId} is ready for settlement`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Approval Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const rejectTask = useCallback(
    async (taskId: string): Promise<ActionResponse> => {
      showToast({ type: 'warning', title: 'Rejecting Task', message: `Cancelling Task #${taskId}...` });
      const res = await walletService.rejectTask(BigInt(taskId));
      if (res.confirmed) {
        showToast({ type: 'info', title: 'Task Rejected', message: `Task #${taskId} was rejected`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Rejection Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );

  const executeTask = useCallback(
    async (taskId: string): Promise<ActionResponse> => {
      showToast({ type: 'info', title: 'Settling Payment', message: `Executing on-chain transfer for Task #${taskId}...` });
      const res = await walletService.executeTask(BigInt(taskId));
      if (res.confirmed) {
        showToast({ type: 'success', title: 'Payment Settled', message: `Receipt issued on BOT Chain`, txHash: res.hash });
        await refresh();
      } else {
        showToast({ type: 'error', title: 'Settlement Failed', message: res.error });
      }
      return { success: res.confirmed, hash: res.hash, error: res.error };
    },
    [refresh, showToast]
  );


  return (
    <Ctx.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        tx,
        clearTx,
        dataProvider,
        treasury,
        agents,
        policies,
        tasks,
        receipts,
        activity,
        loading,
        refresh,
        depositTreasury,
        withdrawTreasury,
        pauseTreasury,
        unpauseTreasury,
        createAgent,
        pauseAgent,
        unpauseAgent,
        createPolicy,
        pausePolicy,
        createTask,
        approveTask,
        rejectTask,
        executeTask,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSury() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSury must be used within SuryProvider');
  return ctx;
}
