import { useState, type ReactNode } from 'react';
import { Copy, Check, ExternalLink, LogOut, ChevronDown } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { walletService } from '@/services/walletService';
import { botChain } from '@/config';
import type { Address } from '@/types';

function shortAddr(a?: Address) { return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ''; }

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
      <button onClick={switchNetwork} className="btn-warning text-sm px-4 py-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-900 animate-pulse-soft" />
        Wrong Network · Switch to BOT Chain
      </button>
    );
  }

  const copy = () => {
    if (wallet.address) { navigator.clipboard.writeText(wallet.address); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300 bg-white hover:border-stone-900 transition text-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-600" />
        <span className="mono">{shortAddr(wallet.address)}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-xl shadow-xl z-40 overflow-hidden animate-rise">
            <div className="p-4 border-b border-stone-100">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Connected Wallet</p>
              <p className="mono text-sm break-all">{wallet.address}</p>
            </div>
            <div className="p-4 border-b border-stone-100 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Balance</span><span className="mono">{wallet.balance ?? '—'} {wallet.symbol ?? botChain.nativeToken}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Network</span><span className="mono">{botChain.name}</span></div>
            </div>
            <div className="p-2">
              <button onClick={copy} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-100 text-sm">
                {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy address'}
              </button>
              <a href={wallet.address ? walletService.getExplorerAddressUrl(wallet.address) : '#'} target="_blank" rel="noreferrer" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-100 text-sm">
                <ExternalLink size={15} /> View on BOT Chain
              </a>
              <button onClick={() => { disconnectWallet(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-100 text-sm text-red-600">
                <LogOut size={15} /> Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PageContainer({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="animate-rise">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-stone-500 mt-1 text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-stone-300 rounded-2xl bg-white/50">
      <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
        <Icon size={22} className="text-stone-500" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-stone-500 text-sm max-w-sm mb-5">{description}</p>
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="h-28 rounded-2xl bg-stone-200/60 animate-pulse-soft" />;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    paused: 'bg-amber-100 text-amber-800 border-amber-200',
    pending: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    executing: 'bg-violet-100 text-violet-800 border-violet-200',
    settled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-stone-200 text-stone-700 border-stone-300',
    cancelled: 'bg-stone-200 text-stone-700 border-stone-300',
  };
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${map[status] ?? 'bg-stone-100 text-stone-700 border-stone-200'}`}><span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
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
    <div className="bg-white border border-stone-200/90 hover:border-stone-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all duration-200 group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">{label}</p>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-stone-50 text-stone-400 group-hover:text-stone-700 transition">
            <Icon size={14} />
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-stone-200/60 animate-pulse-soft rounded" />
      ) : (
        <p className="text-2xl font-bold mono text-stone-900 tracking-tight">{value}</p>
      )}
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}


export function ConnectPrompt({ icon: Icon, description }: { icon: any; description: string }) {
  const { connectWallet } = useSury();
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-stone-300 rounded-2xl bg-white/50">
      <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
        <Icon size={22} className="text-stone-500" />
      </div>
      <h3 className="font-semibold text-lg mb-1">Connect wallet to continue</h3>
      <p className="text-stone-500 text-sm max-w-sm mb-5">{description}</p>
      <button onClick={connectWallet} className="btn-primary text-sm px-4 py-2.5">Connect Wallet</button>
    </div>
  );
}

export function WalletBanner({ message }: { message: string }) {
  const { connectWallet } = useSury();
  return (
    <div className="flex items-center justify-between gap-4 mb-6 px-4 py-3 rounded-xl bg-stone-900 text-white">
      <p className="text-sm">{message}</p>
      <button onClick={connectWallet} className="bg-white text-stone-900 rounded-lg text-sm px-3 py-1.5 font-medium hover:bg-stone-100 transition shrink-0">Connect Wallet</button>
    </div>
  );
}
