import { useState, type ReactNode } from 'react';
import { Copy, Check, ExternalLink, LogOut, ChevronDown } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { walletService } from '@/services/walletService';
import { botChain } from '@/config';
import type { Address } from '@/types';

function shortAddr(a?: Address) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '';
}

export function WalletButton() {
  const { wallet, connectWallet, disconnectWallet, switchNetwork } = useSury();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (wallet.status === 'disconnected') {
    return (
      <button onClick={connectWallet} className="btn-primary text-sm px-4 py-2">
        Connect Wallet
      </button>
    );
  }

  if (wallet.status === 'wrong-network') {
    return (
      <button
        onClick={switchNetwork}
        className="btn-warning text-sm px-4 py-2 flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-soft" />
        Wrong Network · Switch to BOT Chain
      </button>
    );
  }

  const copy = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-sury-primary transition text-sm shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="mono font-medium text-slate-800">{shortAddr(wallet.address)}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden animate-rise">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                Connected Wallet
              </p>
              <p className="mono text-xs font-semibold text-slate-900 break-all">{wallet.address}</p>
            </div>
            <div className="p-4 border-b border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Balance</span>
                <span className="mono font-semibold text-slate-900">
                  {wallet.balance ?? '—'} {wallet.symbol ?? botChain.nativeToken}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Network</span>
                <span className="mono text-slate-700">{botChain.name}</span>
              </div>
            </div>
            <div className="p-2 space-y-0.5">
              <button
                onClick={copy}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? 'Copied to clipboard' : 'Copy address'}
              </button>
              <a
                href={wallet.address ? walletService.getExplorerAddressUrl(wallet.address) : '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              >
                <ExternalLink size={14} /> View on BOT Chain
              </a>
              <button
                onClick={() => {
                  disconnectWallet();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 text-xs font-medium text-red-600 transition"
              >
                <LogOut size={14} /> Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PageContainer({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="animate-rise max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-slate-300 rounded-2xl bg-white/70">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 text-slate-500">
        <Icon size={22} />
      </div>
      <h3 className="font-semibold text-lg text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-5">{description}</p>
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="h-28 rounded-2xl bg-slate-200/60 animate-pulse-soft" />;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    paused: 'bg-amber-50 text-amber-800 border-amber-200/80',
    pending: 'bg-blue-50 text-sury-primary border-blue-200/80',
    approved: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    executing: 'bg-violet-50 text-violet-700 border-violet-200/80',
    settled: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    rejected: 'bg-red-50 text-red-700 border-red-200/80',
    expired: 'bg-slate-100 text-slate-700 border-slate-300',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-300',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
        map[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  loading,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
  icon?: any;
}) {
  return (
    <div className="bg-white border border-slate-200/90 hover:border-sury-primary/30 rounded-2xl p-5 shadow-sm hover:shadow transition-all duration-200 group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{label}</p>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:text-sury-primary group-hover:bg-blue-50 transition">
            <Icon size={14} />
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-slate-200/60 animate-pulse-soft rounded" />
      ) : (
        <p className="text-2xl font-bold mono text-slate-900 tracking-tight">{value}</p>
      )}
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export function ConnectPrompt({ icon: Icon, description }: { icon: any; description: string }) {
  const { connectWallet } = useSury();
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-slate-300 rounded-2xl bg-white/70">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 text-slate-500">
        <Icon size={22} />
      </div>
      <h3 className="font-semibold text-lg text-slate-900 mb-1">Connect wallet to continue</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-5">{description}</p>
      <button onClick={connectWallet} className="btn-primary text-sm px-4 py-2.5">
        Connect Wallet
      </button>
    </div>
  );
}

export function WalletBanner({ message }: { message: string }) {
  const { connectWallet } = useSury();
  return (
    <div className="flex items-center justify-between gap-4 mb-6 px-4 py-3.5 rounded-2xl bg-sury-slate text-white shadow-sm border border-slate-800">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-2 h-2 rounded-full bg-sury-primary animate-pulse shrink-0" />
        <p className="text-sm font-medium text-slate-200 truncate">{message}</p>
      </div>
      <button
        onClick={connectWallet}
        className="btn-primary text-xs px-3.5 py-2 font-semibold shrink-0"
      >
        Connect Wallet
      </button>
    </div>
  );
}
