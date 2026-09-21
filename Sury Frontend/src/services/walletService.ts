import {
  createWalletClient,
  custom,
  encodeFunctionData,
  formatEther,
  parseEther,
} from 'viem';
import { botChain } from '@/config';
import { botChainNetwork, publicClient } from './blockchainDataService';
import { SURY_TREASURY_ABI } from '@/contracts/SuryTreasuryABI';
import type { WalletState, TransactionState, Address } from '@/types';

export interface ContractWriteResult {
  hash?: Address;
  confirmed: boolean;
  error?: string;
}

export interface WalletService {
  connect(): Promise<WalletState>;
  disconnect(): Promise<void>;
  getWalletState(): WalletState;
  onWalletChange(cb: (s: WalletState) => void): () => void;
  onTxChange(cb: (s: TransactionState) => void): () => void;
  switchToBotChain(): Promise<boolean>;
  refreshBalance(): Promise<void>;
  depositTreasury(amountBot: string): Promise<ContractWriteResult>;
  withdrawTreasury(amountBot: string, recipient: Address): Promise<ContractWriteResult>;
  pauseTreasury(): Promise<ContractWriteResult>;
  unpauseTreasury(): Promise<ContractWriteResult>;
  createAgent(
    name: string,
    agentAddress: Address,
    budgetBot: string,
    dailyLimitBot: string,
    perTxLimitBot: string
  ): Promise<ContractWriteResult>;
  pauseAgent(agentId: bigint): Promise<ContractWriteResult>;
  unpauseAgent(agentId: bigint): Promise<ContractWriteResult>;
  createPolicy(
    agentId: bigint,
    budgetBot: string,
    perTxLimitBot: string,
    dailyLimitBot: string,
    approvedTargets: Address[]
  ): Promise<ContractWriteResult>;
  pausePolicy(policyId: bigint): Promise<ContractWriteResult>;
  createTask(
    agentId: bigint,
    description: string,
    amountBot: string,
    destination: Address
  ): Promise<ContractWriteResult>;
  approveTask(taskId: bigint): Promise<ContractWriteResult>;
  rejectTask(taskId: bigint): Promise<ContractWriteResult>;
  executeTask(taskId: bigint): Promise<ContractWriteResult>;
  getExplorerAddressUrl(address: Address): string;
  getExplorerTxUrl(hash: Address): string;
}

// Map custom contract revert signatures to clear user-facing messages
function decodeRevertError(error: any): string {
  const msg = error?.message || error?.details || String(error);

  if (msg.includes('ExceedsPerTxLimit') || msg.includes('0xd1e6b2fa')) {
    return 'BLOCKED BY POLICY: Payment exceeds agent per-transaction limit.';
  }
  if (msg.includes('ExceedsRemainingBudget') || msg.includes('0x3a4dd88e')) {
    return 'BLOCKED BY POLICY: Payment exceeds agent remaining budget.';
  }
  if (msg.includes('ExceedsDailyLimit') || msg.includes('0x70be0e55')) {
    return 'BLOCKED BY POLICY: Payment exceeds agent daily spending limit.';
  }
  if (msg.includes('DestinationNotApproved') || msg.includes('0x3ea793f7')) {
    return 'BLOCKED BY POLICY: Destination address is not authorized in agent policy.';
  }
  if (msg.includes('TokenNotApproved')) {
    return 'BLOCKED BY POLICY: Token is not authorized by policy.';
  }
  if (msg.includes('TaskNotApproved') || msg.includes('0x7dd30397')) {
    return 'BLOCKED BY POLICY: Task is not approved for execution.';
  }
  if (msg.includes('TaskAlreadyExecuted')) {
    return 'BLOCKED BY POLICY: Task has already been settled.';
  }
  if (msg.includes('AgentInactive') || msg.includes('0x40df63a5')) {
    return 'BLOCKED BY POLICY: Agent is currently paused or inactive.';
  }
  if (msg.includes('TreasuryIsPaused') || msg.includes('0x5776d54b')) {
    return 'BLOCKED BY POLICY: Treasury operations are currently paused.';
  }
  if (msg.includes('InsufficientTreasuryBalance') || msg.includes('0x58aeaf5c')) {
    return 'BLOCKED BY POLICY: Insufficient treasury balance to fund this payment.';
  }
  if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('4001')) {
    return 'Transaction rejected by user in wallet.';
  }
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return 'Insufficient BOT in wallet to pay for gas.';
  }

  // Clean raw message
  const firstLine = msg.split('\n')[0];
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
}

class InjectedWalletService implements WalletService {
  private walletListeners = new Set<(s: WalletState) => void>();
  private txListeners = new Set<(s: TransactionState) => void>();
  private state: WalletState = { status: 'disconnected' };

  getWalletState() {
    return this.state;
  }

  onWalletChange(cb: (s: WalletState) => void) {
    this.walletListeners.add(cb);
    return () => this.walletListeners.delete(cb);
  }

  onTxChange(cb: (s: TransactionState) => void) {
    this.txListeners.add(cb);
    return () => this.txListeners.delete(cb);
  }

  private emitWallet() {
    this.walletListeners.forEach((cb) => cb(this.state));
  }

  private emitTx(status: any, hash?: Address, error?: string) {
    this.txListeners.forEach((cb) => cb({ status, hash, error }));
  }

  async refreshBalance() {
    if (this.state.address && this.state.status === 'connected') {
      try {
        const bal = await publicClient.getBalance({ address: this.state.address });
        this.state = {
          ...this.state,
          balance: parseFloat(formatEther(bal)).toFixed(4),
        };
        this.emitWallet();
      } catch (err) {
        console.error('Failed to refresh balance:', err);
      }
    }
  }

  async connect(): Promise<WalletState> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No EVM wallet detected. Please install MetaMask or a compatible EVM wallet.');
    }
    const eth = (window as any).ethereum;

    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const chainIdHex: string = await eth.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);

      const address = accounts[0] as Address;
      const isCorrectNetwork = chainId === botChain.chainId;

      let balance = '0.0000';
      if (isCorrectNetwork && address) {
        try {
          const bal = await publicClient.getBalance({ address });
          balance = parseFloat(formatEther(bal)).toFixed(4);
        } catch (e) {
          console.error(e);
        }
      }

      this.state = {
        status: isCorrectNetwork ? 'connected' : 'wrong-network',
        address,
        chainId,
        balance,
        symbol: botChain.nativeToken,
      };

      eth.removeAllListeners?.('accountsChanged');
      eth.on?.('accountsChanged', (accs: string[]) => {
        if (!accs.length) {
          this.state = { status: 'disconnected' };
        } else {
          this.state = { ...this.state, address: accs[0] as Address };
          this.refreshBalance();
        }
        this.emitWallet();
      });

      eth.removeAllListeners?.('chainChanged');
      eth.on?.('chainChanged', (newChainIdHex: string) => {
        const newChainId = parseInt(newChainIdHex, 16);
        const isMatch = newChainId === botChain.chainId;
        this.state = {
          ...this.state,
          chainId: newChainId,
          status: isMatch ? 'connected' : 'wrong-network',
        };
        if (isMatch) this.refreshBalance();
        this.emitWallet();
      });

      this.emitWallet();
      return this.state;
    } catch (err: any) {
      this.state = { status: 'disconnected' };
      this.emitWallet();
      throw err;
    }
  }

  async disconnect() {
    this.state = { status: 'disconnected' };
    this.emitWallet();
  }

  async switchToBotChain(): Promise<boolean> {
    const eth = (window as any).ethereum;
    if (!eth) return false;

    this.state = { ...this.state, status: 'switching' };
    this.emitWallet();

    const hexChainId = '0x' + botChain.chainId.toString(16);

    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: botChain.name,
                nativeCurrency: {
                  name: botChain.nativeToken,
                  symbol: botChain.nativeToken,
                  decimals: 18,
                },
                rpcUrls: [botChain.rpcUrl],
                blockExplorerUrls: [botChain.explorerUrl],
              },
            ],
          });
        } catch (addError) {
          this.state = { ...this.state, status: 'wrong-network' };
          this.emitWallet();
          return false;
        }
      } else {
        this.state = { ...this.state, status: 'wrong-network' };
        this.emitWallet();
        return false;
      }
    }

    const chainIdHex = await eth.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    const isMatch = chainId === botChain.chainId;

    this.state = {
      ...this.state,
      chainId,
      status: isMatch ? 'connected' : 'wrong-network',
    };
    if (isMatch) await this.refreshBalance();
    this.emitWallet();
    return isMatch;
  }

  private async executeContractWrite(
    functionName: string,
    args: any[],
    value?: bigint
  ): Promise<ContractWriteResult> {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('No EVM wallet found');

    if (this.state.status !== 'connected' || this.state.chainId !== botChain.chainId) {
      await this.switchToBotChain();
      if (this.state.status !== 'connected') {
        return { confirmed: false, error: 'Please switch your wallet to BOT Chain Mainnet.' };
      }
    }

    const walletClient = createWalletClient({
      chain: botChainNetwork,
      transport: custom(eth),
    });

    const [account] = await walletClient.getAddresses();
    if (!account) return { confirmed: false, error: 'No wallet account selected.' };

    try {
      this.emitTx('awaiting-signature');

      // First run simulation to catch on-chain reverts early
      await publicClient.simulateContract({
        address: botChain.contracts.treasury,
        abi: SURY_TREASURY_ABI,
        functionName: functionName as any,
        args: args as any,
        value,
        account,
      });

      const hash = await walletClient.writeContract({
        address: botChain.contracts.treasury,
        abi: SURY_TREASURY_ABI,
        functionName: functionName as any,
        args: args as any,
        value,
        account,
      });

      this.emitTx('submitted', hash);

      // Wait for real on-chain confirmation on BOT Chain
      this.emitTx('pending', hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        this.emitTx('confirmed', hash);
        await this.refreshBalance();
        return { hash, confirmed: true };
      } else {
        this.emitTx('failed', hash, 'Transaction failed on-chain.');
        return { hash, confirmed: false, error: 'Transaction failed on BOT Chain.' };
      }
    } catch (err: any) {
      console.error(`Contract write ${functionName} error:`, err);
      const decodedError = decodeRevertError(err);
      this.emitTx('failed', undefined, decodedError);
      return { confirmed: false, error: decodedError };
    }
  }

  // --- High-Level Protocol Actions ---

  async depositTreasury(amountBot: string): Promise<ContractWriteResult> {
    const value = parseEther(amountBot);
    return this.executeContractWrite('deposit', [], value);
  }

  async withdrawTreasury(amountBot: string, recipient: Address): Promise<ContractWriteResult> {
    const amount = parseEther(amountBot);
    return this.executeContractWrite('withdraw', [amount, recipient]);
  }

  async pauseTreasury(): Promise<ContractWriteResult> {
    return this.executeContractWrite('pause', []);
  }

  async unpauseTreasury(): Promise<ContractWriteResult> {
    return this.executeContractWrite('unpause', []);
  }

  async createAgent(
    name: string,
    agentAddress: Address,
    budgetBot: string,
    dailyLimitBot: string,
    perTxLimitBot: string
  ): Promise<ContractWriteResult> {
    const budget = parseEther(budgetBot);
    const dailyLimit = parseEther(dailyLimitBot);
    const perTxLimit = parseEther(perTxLimitBot);
    return this.executeContractWrite('createAgent', [name, agentAddress, budget, dailyLimit, perTxLimit, 0n]);
  }

  async pauseAgent(agentId: bigint): Promise<ContractWriteResult> {
    return this.executeContractWrite('pauseAgent', [agentId]);
  }

  async unpauseAgent(agentId: bigint): Promise<ContractWriteResult> {
    return this.executeContractWrite('unpauseAgent', [agentId]);
  }

  async createPolicy(
    agentId: bigint,
    budgetBot: string,
    perTxLimitBot: string,
    dailyLimitBot: string,
    approvedTargets: Address[]
  ): Promise<ContractWriteResult> {
    const budget = parseEther(budgetBot);
    const perTxLimit = parseEther(perTxLimitBot);
    const dailyLimit = parseEther(dailyLimitBot);
    const NATIVE_BOT = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    return this.executeContractWrite('createPolicy', [
      agentId,
      budget,
      perTxLimit,
      dailyLimit,
      [NATIVE_BOT],
      approvedTargets,
      0n,
    ]);
  }

  async pausePolicy(policyId: bigint): Promise<ContractWriteResult> {
    return this.executeContractWrite('pausePolicy', [policyId]);
  }

  async createTask(
    agentId: bigint,
    description: string,
    amountBot: string,
    destination: Address
  ): Promise<ContractWriteResult> {
    const amount = parseEther(amountBot);
    const NATIVE_BOT = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    return this.executeContractWrite('createTask', [
      agentId,
      description,
      amount,
      NATIVE_BOT,
      destination,
      '0x0000000000000000000000000000000000000000',
      0n,
    ]);
  }

  async approveTask(taskId: bigint): Promise<ContractWriteResult> {
    return this.executeContractWrite('approveTask', [taskId]);
  }

  async rejectTask(taskId: bigint): Promise<ContractWriteResult> {
    return this.executeContractWrite('rejectTask', [taskId]);
  }

  async executeTask(taskId: bigint): Promise<ContractWriteResult> {
    return this.executeContractWrite('executeTask', [taskId]);
  }

  getExplorerAddressUrl(address: Address) {
    return `${botChain.explorerUrl}/address/${address}`;
  }

  getExplorerTxUrl(hash: Address) {
    return `${botChain.explorerUrl}/tx/${hash}`;
  }
}

export const walletService: WalletService = new InjectedWalletService();
