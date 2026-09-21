import { useState } from 'react';
import { ShieldCheck, Plus, Pause, Loader2, ExternalLink } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { PageContainer, EmptyState, StatusBadge, SkeletonCard, WalletBanner } from '@/components/ui';
import type { Policy, Address } from '@/types';

export function PoliciesPage() {
  const { policies, agents, loading, wallet } = useSury();
  const [showCreate, setShowCreate] = useState(false);

  const disconnected = wallet.status !== 'connected';

  return (
    <PageContainer
      title="Policies"
      subtitle="Programmable spending rules enforced directly by smart contract on BOT Chain"
      action={
        disconnected ? null : (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
          >
            <Plus size={16} /> Create Policy
          </button>
        )
      }
    >
      {disconnected && (
        <WalletBanner message="Connect your wallet to configure programmable spending policies." />
      )}

      {loading.policies && !disconnected && policies.length === 0 ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No policies yet"
          description="Create a policy to define what an agent is allowed to spend, where, and when."
          action={
            disconnected ? undefined : (
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
              >
                <Plus size={16} /> Create Policy
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <PolicyRow key={p.id} policy={p} />
          ))}
        </div>
      )}

      {showCreate && <CreatePolicyModal onClose={() => setShowCreate(false)} />}
    </PageContainer>
  );
}

function PolicyRow({ policy }: { policy: Policy }) {
  const { pausePolicy } = useSury();
  const [pausing, setPausing] = useState(false);

  const handlePause = async () => {
    setPausing(true);
    try {
      await pausePolicy(policy.id);
    } finally {
      setPausing(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={policy.status} />
          <div>
            <p className="font-medium text-sm">Policy #{policy.id} · Agent #{policy.agentId}</p>
            <p className="text-xs text-stone-400 mono mt-0.5">
              Budget {policy.budget} BOT · Per-tx {policy.perTransactionLimit} BOT · Daily {policy.dailyLimit} BOT
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-stone-100 mono text-stone-700">Token: BOT</span>
          <span className="px-2.5 py-1 rounded-md bg-stone-100 mono text-stone-700">
            {policy.approvedTargets.length > 0 ? `${policy.approvedTargets.length} Allowed Target(s)` : 'Any Destination'}
          </span>
          {policy.expiry && <span className="px-2.5 py-1 rounded-md bg-stone-100 mono text-stone-700">Exp {policy.expiry}</span>}
        </div>
        <div className="flex gap-2">
          {policy.status === 'active' && (
            <button
              onClick={handlePause}
              disabled={pausing}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {pausing ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />} Pause
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreatePolicyModal({ onClose }: { onClose: () => void }) {
  const { agents, createPolicy } = useSury();
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '1');
  const [budget, setBudget] = useState('0.01');
  const [perTxLimit, setPerTxLimit] = useState('0.002');
  const [dailyLimit, setDailyLimit] = useState('0.005');
  const [targetAddress, setTargetAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedAgentId) {
      setError('Please select an agent.');
      return;
    }
    if (!budget || parseFloat(budget) <= 0) {
      setError('Please enter a valid budget.');
      return;
    }
    const targets: Address[] = [];
    if (targetAddress.trim()) {
      const parts = targetAddress.split(',').map((t) => t.trim());
      for (const p of parts) {
        if (!p.startsWith('0x') || p.length !== 42) {
          setError(`Invalid target address: ${p}`);
          return;
        }
        targets.push(p as Address);
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await createPolicy(selectedAgentId, budget, perTxLimit, dailyLimit, targets);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Policy creation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-rise max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Create Spending Policy</h3>
        <p className="text-sm text-stone-500 mb-5">
          This policy defines strict limits enforced on-chain. Unauthorized amounts or destinations will cause transactions to revert.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Target Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="input-field"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  Agent #{a.id} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Policy Budget Cap (BOT)</label>
            <input
              type="number"
              step="0.0001"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.01"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Per-Transaction Limit (BOT)</label>
              <input
                type="number"
                step="0.0001"
                value={perTxLimit}
                onChange={(e) => setPerTxLimit(e.target.value)}
                placeholder="0.002"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Daily Spending Limit (BOT)</label>
              <input
                type="number"
                step="0.0001"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="0.005"
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Approved Target / Contract Address (optional)</label>
            <input
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x... (Leave empty to allow any destination)"
              className="input-field mono"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              If specified, payments to any other destination will be rejected on-chain.
            </p>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} disabled={submitting} className="btn-ghost flex-1 py-2.5">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}
