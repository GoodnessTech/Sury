import { Wallet, Plus, Pause, Play, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Loader2, ShieldCheck, Coins } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { PageContainer, MetricCard, EmptyState, StatusBadge, SkeletonCard, WalletBanner } from '@/components/ui';
import { TreasuryGauge } from '@/components/AnalyticsCharts';
import { useState } from 'react';
import { walletService } from '@/services/walletService';
import type { Address } from '@/types';

export function TreasuryPage() {
  const { treasury, loading, wallet, pauseTreasury, unpauseTreasury } = useSury();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [pausing, setPausing] = useState(false);

  const disconnected = wallet.status !== 'connected';

  const handleTogglePause = async () => {
    setPausing(true);
    try {
      if (treasury?.status === 'active') {
        await pauseTreasury();
      } else {
        await unpauseTreasury();
      }
    } finally {
      setPausing(false);
    }
  };

  return (
    <PageContainer
      title="Protocol Treasury"
      subtitle="On-chain reserves & liquidity custody · BOT Chain Mainnet"
      action={
        disconnected ? null : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowDeposit(true)}
              className="btn-secondary text-sm px-4 py-2.5 flex items-center gap-2"
            >
              <ArrowDownToLine size={16} /> Deposit
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="btn-secondary text-sm px-4 py-2.5 flex items-center gap-2"
            >
              <ArrowUpFromLine size={16} /> Withdraw
            </button>
            {treasury?.status === 'active' ? (
              <button
                onClick={handleTogglePause}
                disabled={pausing}
                className="btn-warning text-sm px-4 py-2.5 flex items-center gap-2"
              >
                {pausing ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />} Pause
              </button>
            ) : (
              <button
                onClick={handleTogglePause}
                disabled={pausing}
                className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
              >
                {pausing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Unpause
              </button>
            )}
          </div>
        )
      }
    >
      {disconnected && (
        <WalletBanner message="Viewing treasury reserves in read-only mode. Connect your wallet to deposit, withdraw, or pause." />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard
          label="Treasury Balance"
          value={`${treasury?.balance ?? '0.0000'} BOT`}
          loading={loading.treasury}
          icon={Wallet}
        />
        <MetricCard
          label="Available Liquidity"
          value={`${treasury?.availableBalance ?? '0.0000'} BOT`}
          loading={loading.treasury}
          icon={ShieldCheck}
        />
        <MetricCard
          label="Total Deposited"
          value={`${treasury?.totalDeposited ?? '0.0000'} BOT`}
          loading={loading.treasury}
          icon={Coins}
        />
        <MetricCard
          label="Total Spent"
          value={`${treasury?.totalSpent ?? '0.0000'} BOT`}
          loading={loading.treasury}
        />
        <MetricCard
          label="Today's Spending"
          value={`${treasury?.todaySpent ?? '0.0000'} BOT`}
          loading={loading.treasury}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <TreasuryGauge treasury={treasury} />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-6 space-y-4 shadow-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">
                    Verified Protocol Smart Contract
                  </p>
                  <p className="mono text-sm text-stone-800 break-all font-semibold">
                    {treasury?.id ?? '0xcB68b99e5b02b1E6A6AEE361089e1AdcdACEfe00'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={treasury?.status ?? 'active'} />
                  {treasury?.id && (
                    <a
                      href={walletService.getExplorerAddressUrl(treasury.id as Address)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <ExternalLink size={13} /> Explorer
                    </a>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100 text-xs">
                <div>
                  <span className="text-stone-400 block mb-1">Network</span>
                  <span className="font-semibold text-stone-800">BOT Chain Mainnet (Chain ID 677)</span>
                </div>
                <div>
                  <span className="text-stone-400 block mb-1">Gas Currency</span>
                  <span className="font-semibold text-stone-800">BOT (Native 18 Decimals)</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-500 pt-3 border-t border-stone-100">
              SURY operates as an autonomous financial operating system. Funds in this treasury are reserved exclusively for registered autonomous agents subject to immutable, programmatic policy limits enforced directly by the smart contract.
            </p>
          </div>
        </div>
      </div>


      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} />}
    </PageContainer>
  );
}

function DepositModal({ onClose }: { onClose: () => void }) {
  const { depositTreasury } = useSury();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid BOT amount.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await depositTreasury(amount);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Deposit failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-rise" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Fund Treasury</h3>
        <p className="text-sm text-stone-500 mb-4">
          Deposit native BOT from your connected wallet into the protocol treasury.
        </p>
        <label className="text-sm font-medium block mb-1">Amount (BOT)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
          type="number"
          step="0.0001"
          className="input-field mb-2"
        />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <p className="text-xs text-stone-400 mb-4">
          Treasury balances update directly from BOT Chain Mainnet after transaction confirmation.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={submitting} className="btn-ghost flex-1 py-2.5">
            Cancel
          </button>
          <button onClick={handleDeposit} disabled={submitting} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Confirming...' : 'Deposit BOT'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const { withdrawTreasury, wallet } = useSury();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState(wallet.address || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
      setError('Please enter a valid EVM recipient address.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await withdrawTreasury(amount, recipient as Address);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Withdrawal failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-rise" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Withdraw from Treasury</h3>
        <p className="text-sm text-stone-500 mb-4">
          Withdraw BOT from the treasury reserves to a designated address (owner only).
        </p>
        <label className="text-sm font-medium block mb-1">Amount (BOT)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
          type="number"
          step="0.0001"
          className="input-field mb-3"
        />
        <label className="text-sm font-medium block mb-1">Recipient Address</label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="input-field mono mb-2"
        />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} disabled={submitting} className="btn-ghost flex-1 py-2.5">
            Cancel
          </button>
          <button onClick={handleWithdraw} disabled={submitting} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Withdrawing...' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  );
}
