import { useState } from 'react';
import { ListTodo, Plus, Check, X, Play, ShieldCheck, ShieldAlert, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { PageContainer, EmptyState, StatusBadge, SkeletonCard, WalletBanner } from '@/components/ui';
import { walletService } from '@/services/walletService';
import type { Task, Address } from '@/types';

export function TasksPage() {
  const { tasks, loading, wallet } = useSury();
  const [showCreate, setShowCreate] = useState(false);
  const [lastTxError, setLastTxError] = useState<string | null>(null);

  const disconnected = wallet.status !== 'connected';

  return (
    <PageContainer
      title="Tasks"
      subtitle="Authorized jobs for agents to execute on BOT Chain Mainnet"
      action={
        disconnected ? null : (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
          >
            <Plus size={16} /> Create Task
          </button>
        )
      }
    >
      {disconnected && (
        <WalletBanner message="Connect your wallet to authorize and execute agent tasks on BOT Chain." />
      )}

      {lastTxError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-3 animate-rise">
          <div className="flex items-start gap-2.5 text-sm">
            <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Execution Blocked</p>
              <p className="text-xs text-red-700 mt-0.5">{lastTxError}</p>
            </div>
          </div>
          <button onClick={() => setLastTxError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {loading.tasks && !disconnected && tasks.length === 0 ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          description="Create a task to authorize an agent to execute an on-chain payment."
          action={
            disconnected ? undefined : (
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
              >
                <Plus size={16} /> Create Task
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onError={setLastTxError} />
          ))}
        </div>
      )}

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </PageContainer>
  );
}

function TaskRow({ task, onError }: { task: Task; onError: (err: string) => void }) {
  const { approveTask, rejectTask, executeTask } = useSury();
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await approveTask(task.id);
      if (!res.success && res.error) onError(res.error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const res = await rejectTask(task.id);
      if (!res.success && res.error) onError(res.error);
    } finally {
      setProcessing(false);
    }
  };

  const handleExecute = async () => {
    setProcessing(true);
    try {
      const res = await executeTask(task.id);
      if (!res.success && res.error) {
        onError(res.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={task.status} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-400">#{task.id}</span>
              <p className="font-medium text-sm truncate">{task.description}</p>
            </div>
            <p className="text-xs text-stone-400 mono mt-0.5 truncate">
              {task.amount} {task.token} → {task.destination}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {processing ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} Approve
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 text-stone-500 hover:text-red-600"
              >
                <X size={14} /> Reject
              </button>
            </>
          )}

          {task.status === 'approved' && (
            <button
              onClick={handleExecute}
              disabled={processing}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {processing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Execute Payment
            </button>
          )}

          {task.status === 'settled' && (
            <a
              href={walletService.getExplorerAddressUrl(task.destination)}
              target="_blank"
              rel="noreferrer"
              className="text-xs mono text-stone-400 hover:text-stone-700 flex items-center gap-1"
            >
              Settled <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { agents, createTask, wallet } = useSury();
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '1');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.0001');
  const [destination, setDestination] = useState(wallet.address || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAgent = agents.find((a) => a.id === selectedAgentId);
  const amtNum = parseFloat(amount || '0');
  const perTxNum = currentAgent ? parseFloat(currentAgent.perTransactionLimit) : Infinity;
  const remainingNum = currentAgent ? parseFloat(currentAgent.remainingBudget) : Infinity;

  const exceedsPerTx = currentAgent && amtNum > perTxNum;
  const exceedsBudget = currentAgent && amtNum > remainingNum;
  const hasViolation = exceedsPerTx || exceedsBudget;

  const handleSubmit = async () => {
    if (!selectedAgentId) {
      setError('Please select an agent.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a task description.');
      return;
    }
    if (!amount || amtNum <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!destination || !destination.startsWith('0x') || destination.length !== 42) {
      setError('Please enter a valid recipient address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await createTask(selectedAgentId, description.trim(), amount, destination as Address);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Task creation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-rise max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Create Task</h3>
        <p className="text-sm text-stone-500 mb-5">
          Authorize an agent to execute a payment on BOT Chain. The policy rules are evaluated on-chain prior to settlement.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="input-field"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  Agent #{a.id} — {a.name} (Remaining: {a.remainingBudget} BOT)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Task Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Compute cluster batch payment"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Amount (BOT)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="0.0001"
                placeholder="0.0001"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Token</label>
              <input value="BOT (Native)" disabled className="input-field bg-stone-100 text-stone-500" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Recipient Destination</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="0x..."
              className="input-field mono"
            />
          </div>
        </div>

        {/* Real-time Policy Preview */}
        <div className={`mt-5 p-4 rounded-xl border ${hasViolation ? 'bg-red-50/70 border-red-200' : 'bg-stone-50 border-stone-200'}`}>
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">On-Chain Policy Preview</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Per-transaction Limit</span>
              <span className="mono">{currentAgent ? `${currentAgent.perTransactionLimit} BOT` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Remaining Agent Budget</span>
              <span className="mono">{currentAgent ? `${currentAgent.remainingBudget} BOT` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Daily Spending Limit</span>
              <span className="mono">{currentAgent ? `${currentAgent.dailyLimit} BOT` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Requested Amount</span>
              <span className="mono font-semibold">{amount || '0'} BOT</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-200 mt-2">
              <span className="text-stone-600 font-medium">Policy Verification</span>
              {hasViolation ? (
                <span className="flex items-center gap-1 font-semibold text-red-600">
                  <ShieldAlert size={14} />
                  {exceedsPerTx ? 'Exceeds Per-Tx Limit' : 'Exceeds Budget'}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <ShieldCheck size={14} /> Within Policy Limits
                </span>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} disabled={submitting} className="btn-ghost flex-1 py-2.5">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
