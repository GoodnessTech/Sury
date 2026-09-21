import { useState } from 'react';
import { Users, Plus, Pause, Play, Eye, Loader2, ExternalLink } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { PageContainer, EmptyState, StatusBadge, SkeletonCard, WalletBanner } from '@/components/ui';
import { walletService } from '@/services/walletService';
import type { RouteId } from '@/config';
import type { Agent, Address } from '@/types';

export function AgentsPage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  const { agents, loading, wallet } = useSury();
  const [showCreate, setShowCreate] = useState(false);

  const disconnected = wallet.status !== 'connected';

  return (
    <PageContainer
      title="Agents"
      subtitle="Economic actors controlled by programmable treasury policy"
      action={
        disconnected ? null : (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
          >
            <Plus size={16} /> Create Agent
          </button>
        )
      }
    >
      {disconnected && (
        <WalletBanner message="Connect your wallet to create and manage autonomous agents on BOT Chain." />
      )}

      {loading.agents && !disconnected && agents.length === 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No agents yet"
          description="Create an agent to assign budgets, daily limits, and programmable spending policies."
          action={
            disconnected ? undefined : (
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
              >
                <Plus size={16} /> Create Agent
              </button>
            )
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {showCreate && <CreateAgentModal onClose={() => setShowCreate(false)} />}
    </PageContainer>
  );
}

function AgentCard({ agent, onNavigate }: { agent: Agent; onNavigate: (r: RouteId) => void }) {
  const { pauseAgent, unpauseAgent } = useSury();
  const [pausing, setPausing] = useState(false);

  const handleToggle = async () => {
    setPausing(true);
    try {
      if (agent.status === 'active') {
        await pauseAgent(agent.id);
      } else {
        await unpauseAgent(agent.id);
      }
    } finally {
      setPausing(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-stone-900">{agent.name}</h3>
            <p className="mono text-xs text-stone-400 mt-0.5 truncate max-w-[200px]">{agent.address}</p>
          </div>
          <StatusBadge status={agent.status} />
        </div>
        <div className="space-y-2 text-sm border-t border-stone-100 pt-3">
          <Row label="Assigned Budget" value={`${agent.assignedBudget} BOT`} />
          <Row label="Remaining Budget" value={`${agent.remainingBudget} BOT`} />
          <Row label="Total Spent" value={`${agent.spent} BOT`} />
          <Row label="Daily Limit" value={`${agent.dailyLimit} BOT`} />
          <Row label="Task Count" value={String(agent.taskCount)} />
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-stone-100">
        <a
          href={walletService.getExplorerAddressUrl(agent.address)}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
        >
          <ExternalLink size={13} /> Explorer
        </a>
        <button
          onClick={handleToggle}
          disabled={pausing}
          className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
        >
          {pausing ? <Loader2 size={13} className="animate-spin" /> : agent.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
          {agent.status === 'active' ? 'Pause' : 'Unpause'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="mono font-medium">{value}</span>
    </div>
  );
}

function CreateAgentModal({ onClose }: { onClose: () => void }) {
  const { createAgent, wallet } = useSury();
  const [name, setName] = useState('');
  const [agentAddress, setAgentAddress] = useState(wallet.address || '');
  const [budget, setBudget] = useState('0.01');
  const [dailyLimit, setDailyLimit] = useState('0.005');
  const [perTxLimit, setPerTxLimit] = useState('0.002');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please provide a name for the agent.');
      return;
    }
    if (!agentAddress || !agentAddress.startsWith('0x') || agentAddress.length !== 42) {
      setError('Please provide a valid EVM address for the agent.');
      return;
    }
    if (!budget || parseFloat(budget) <= 0) {
      setError('Please enter a valid assigned budget.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await createAgent(
        name.trim(),
        agentAddress as Address,
        budget,
        dailyLimit || budget,
        perTxLimit || budget
      );
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Agent creation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-rise max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Create Autonomous Agent</h3>
        <p className="text-sm text-stone-500 mb-4">
          Register an autonomous economic actor that can spend treasury funds strictly within policy limits.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium block mb-1">Agent Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Data Compute Agent"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Agent Address (EOA or Smart Account)</label>
            <input
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value)}
              placeholder="0x..."
              className="input-field mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Assigned Budget (BOT)</label>
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              type="number"
              step="0.0001"
              placeholder="0.01"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Daily Limit (BOT)</label>
              <input
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                type="number"
                step="0.0001"
                placeholder="0.005"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Per-Tx Limit (BOT)</label>
              <input
                value={perTxLimit}
                onChange={(e) => setPerTxLimit(e.target.value)}
                type="number"
                step="0.0001"
                placeholder="0.002"
                className="input-field"
              />
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <p className="text-xs text-stone-400 mb-4">
          Limits are enforced by the SURY smart contract. Any execution exceeding these rules will revert on-chain.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={submitting} className="btn-ghost flex-1 py-2.5">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
