import {
  Plus,
  Wallet,
  Users,
  ListTodo,
  ReceiptText,
  Activity as ActivityIcon,
  ArrowRight,
  ShieldCheck,
  Zap,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import {
  PageContainer,
  MetricCard,
  EmptyState,
  StatusBadge,
  SkeletonCard,
  WalletBanner,
} from '@/components/ui';
import {
  TreasuryGauge,
  TaskPipelineFlow,
  AgentUtilizationList,
} from '@/components/AnalyticsCharts';
import { botChain, type RouteId } from '@/config';

export function OverviewPage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  const { treasury, agents, tasks, receipts, activity, loading, wallet } = useSury();

  const isConnected = wallet.status === 'connected';
  const activeAgents = agents.filter((a) => a.status === 'active');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');

  return (
    <PageContainer
      title="Treasury Overview"
      subtitle="Autonomous Agent Treasury OS · BOT Chain Mainnet"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('treasury')}
            className="btn-secondary text-sm px-4 py-2.5 flex items-center gap-2"
          >
            <Coins size={16} /> Manage Treasury
          </button>
          <button
            onClick={() => onNavigate('agents')}
            className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
          >
            <Plus size={16} /> New Agent
          </button>
        </div>
      }
    >
      {!isConnected && (
        <WalletBanner message="Connected to BOT Chain in read-only mode. Connect wallet to execute on-chain transactions." />
      )}

      {/* Top Protocol Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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
          label="Total Settled"
          value={`${treasury?.totalSpent ?? '0.0000'} BOT`}
          loading={loading.treasury}
          icon={ReceiptText}
        />
        <MetricCard
          label="Today's Spend"
          value={`${treasury?.todaySpent ?? '0.0000'} BOT`}
          loading={loading.treasury}
          icon={ActivityIcon}
        />
        <MetricCard
          label="Active Agents"
          value={String(activeAgents.length)}
          loading={loading.agents}
          icon={Users}
        />
        <MetricCard
          label="Pending Tasks"
          value={String(pendingTasks.length)}
          loading={loading.tasks}
          icon={ListTodo}
        />
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TreasuryGauge treasury={treasury} />
        <TaskPipelineFlow tasks={tasks} />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Budgets & List */}
          <AgentUtilizationList agents={agents} />

          <Section title="Registered Autonomous Agents" icon={Users} onMore={() => onNavigate('agents')}>
            {loading.agents ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No agents registered yet"
                description="Register an autonomous bot or agent account to allocate financial budgets."
                action={
                  <button onClick={() => onNavigate('agents')} className="btn-primary text-sm px-4 py-2 mt-2">
                    Create Agent
                  </button>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {agents.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className="border border-stone-200/90 rounded-2xl p-4 bg-white hover:border-stone-400 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-stone-900">{a.name}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mono text-xs text-stone-400 mb-3 truncate">
                      {a.address}
                    </p>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-stone-100">
                      <span className="text-stone-500">Remaining Budget</span>
                      <span className="mono font-bold text-stone-900">
                        {a.remainingBudget} / {a.assignedBudget} BOT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Recent Task Proposals */}
          <Section title="Recent Task Proposals" icon={ListTodo} onMore={() => onNavigate('tasks')}>
            {loading.tasks ? (
              <SkeletonCard />
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="No tasks in queue"
                description="Agents propose payment tasks that are governed and settled on-chain."
              />
            ) : (
              <div className="space-y-2.5">
                {tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border border-stone-200/80 rounded-xl p-3.5 bg-white hover:border-stone-300 transition text-sm shadow-sm"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-stone-900 truncate">{t.description}</p>
                      <p className="mono text-xs text-stone-400 truncate mt-0.5">
                        Dest: {t.destination}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="mono font-bold text-stone-900">
                        {t.amount} {t.token}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Right Sidebar: Settlements & Live Activity */}
        <div className="space-y-6">
          <Section title="Settled Receipts" icon={ReceiptText} onMore={() => onNavigate('receipts')}>
            {loading.receipts ? (
              <SkeletonCard />
            ) : receipts.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="No receipts recorded"
                description="Settlement receipts will appear after payments are executed."
              />
            ) : (
              <div className="space-y-2.5">
                {receipts.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="border border-stone-200/80 rounded-xl p-3.5 bg-white text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <a
                        href={`${botChain.explorerUrl}/tx/${r.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mono text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
                      >
                        {r.transactionHash.slice(0, 10)}... <ExternalLink size={11} />
                      </a>
                      <StatusBadge status="settled" />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-500">{r.taskId}</span>
                      <span className="mono font-bold text-emerald-700">
                        {r.amount} {r.token}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="On-Chain Event Stream" icon={ActivityIcon} onMore={() => onNavigate('activity')}>
            {loading.activity ? (
              <SkeletonCard />
            ) : activity.length === 0 ? (
              <EmptyState
                icon={ActivityIcon}
                title="No recent events"
                description="Live protocol and agent events will stream here."
              />
            ) : (
              <div className="space-y-2.5">
                {activity.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 text-xs border border-stone-200/80 rounded-xl p-3 bg-white shadow-sm"
                  >
                    <StatusBadge status={a.status} />
                    <span className="text-stone-700 truncate font-medium flex-1">
                      {a.label}
                    </span>
                    <span className="text-stone-400 font-mono text-[10px] shrink-0">
                      {a.createdAt}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}

function Section({
  title,
  icon: Icon,
  onMore,
  children,
}: {
  title: string;
  icon: any;
  onMore: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-bold text-stone-900 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Icon size={16} className="text-stone-500" /> {title}
        </h2>
        <button
          onClick={onMore}
          className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1 transition"
        >
          View all <ArrowRight size={13} />
        </button>
      </div>
      {children}
    </div>
  );
}
