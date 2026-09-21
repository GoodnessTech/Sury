import { PieChart, TrendingUp, ShieldCheck, Zap, Activity } from 'lucide-react';
import type { Treasury, Agent, Task } from '@/types';

interface TreasuryMetricsProps {
  treasury: Treasury | null;
  agents: Agent[];
  tasks: Task[];
}

export function TreasuryGauge({ treasury }: { treasury: Treasury | null }) {
  const balance = parseFloat(treasury?.balance || '0');
  const spent = parseFloat(treasury?.totalSpent || '0');
  const deposited = parseFloat(treasury?.totalDeposited || '0');
  const total = balance + spent > 0 ? balance + spent : deposited > 0 ? deposited : 1;

  const spentRatio = Math.min(100, Math.round((spent / total) * 100));
  const availableRatio = 100 - spentRatio;

  // SVG Gauge calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (availableRatio / 100) * circumference;

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
            Treasury Liquidity Health
          </span>
          <h4 className="text-base font-semibold text-stone-900 mt-0.5">Capital Utilization</h4>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
          <ShieldCheck size={18} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Gauge */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background Circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="text-stone-100"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Available Progress Arc */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="text-emerald-500 transition-all duration-700 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={isNaN(strokeDashoffset) ? 0 : strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold font-mono text-stone-900 leading-none">
              {availableRatio}%
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 uppercase tracking-wide">
              Available
            </span>
          </div>
        </div>

        {/* Legend / Metrics */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-stone-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Available Balance
            </span>
            <span className="font-mono font-semibold text-stone-900">
              {balance.toFixed(4)} BOT
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-stone-500">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
              Total Settled Spend
            </span>
            <span className="font-mono font-semibold text-stone-900">
              {spent.toFixed(4)} BOT
            </span>
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-400">Total Inflow</span>
            <span className="font-mono text-stone-600 font-medium">
              {deposited.toFixed(4)} BOT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskPipelineFlow({ tasks }: { tasks: Task[] }) {
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const approved = tasks.filter((t) => t.status === 'approved').length;
  const settled = tasks.filter((t) => t.status === 'settled').length;
  const total = tasks.length || 1;

  const pendingPct = Math.round((pending / total) * 100);
  const approvedPct = Math.round((approved / total) * 100);
  const settledPct = Math.round((settled / total) * 100);

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
            Task Settlement Pipeline
          </span>
          <h4 className="text-base font-semibold text-stone-900 mt-0.5">Execution Funnel</h4>
        </div>
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
          <Zap size={18} />
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex my-4">
        <div
          style={{ width: `${settledPct}%` }}
          className="bg-emerald-500 h-full transition-all duration-500"
          title={`Settled: ${settled}`}
        />
        <div
          style={{ width: `${approvedPct}%` }}
          className="bg-indigo-500 h-full transition-all duration-500"
          title={`Approved: ${approved}`}
        />
        <div
          style={{ width: `${pendingPct}%` }}
          className="bg-amber-400 h-full transition-all duration-500"
          title={`Pending: ${pending}`}
        />
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
          <p className="text-amber-800 font-bold font-mono text-base">{pending}</p>
          <p className="text-stone-500 text-[11px] font-medium">Pending</p>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
          <p className="text-indigo-800 font-bold font-mono text-base">{approved}</p>
          <p className="text-stone-500 text-[11px] font-medium">Approved</p>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <p className="text-emerald-800 font-bold font-mono text-base">{settled}</p>
          <p className="text-stone-500 text-[11px] font-medium">Settled</p>
        </div>
      </div>
    </div>
  );
}

export function AgentUtilizationList({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
            Active Agent Budgets
          </span>
          <h4 className="text-base font-semibold text-stone-900 mt-0.5">Budget Consumption</h4>
        </div>
        <div className="p-2 rounded-xl bg-stone-100 text-stone-600">
          <Activity size={18} />
        </div>
      </div>

      <div className="space-y-3">
        {agents.slice(0, 4).map((ag) => {
          const assigned = parseFloat(ag.assignedBudget) || 1;
          const remaining = parseFloat(ag.remainingBudget) || 0;
          const spent = parseFloat(ag.spent) || 0;
          const pct = Math.min(100, Math.round((spent / assigned) * 100));

          return (
            <div key={ag.id} className="text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-800">{ag.name}</span>
                <span className="mono text-stone-500">
                  {remaining.toFixed(4)} / {assigned.toFixed(4)} BOT remaining
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
