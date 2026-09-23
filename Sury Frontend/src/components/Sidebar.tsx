import { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  ShieldCheck,
  ListTodo,
  ReceiptText,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { navigation, type RouteId, botChain } from '@/config';
import { WalletButton } from '@/components/ui';
import { useSury } from '@/store/SuryContext';

const icons: Record<RouteId, any> = {
  overview: LayoutDashboard,
  treasury: Wallet,
  agents: Users,
  policies: ShieldCheck,
  tasks: ListTodo,
  receipts: ReceiptText,
  activity: Activity,
};

export function Sidebar({
  route,
  onNavigate,
}: {
  route: RouteId;
  onNavigate: (r: RouteId) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { wallet } = useSury();
  const sections = Array.from(new Set(navigation.map((n) => n.section)));

  const Nav = () => (
    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
      {sections.map((sec) => (
        <div key={sec}>
          <p className="px-3 text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">
            {sec}
          </p>
          <div className="space-y-1">
            {navigation
              .filter((n) => n.section === sec)
              .map((n) => {
                const Icon = icons[n.id];
                const active = route === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      onNavigate(n.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-sury-primary text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={17} className={active ? 'text-white' : 'text-slate-400'} />
                    {n.label}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/sury-icon.png" alt="SURY" className="w-7 h-7 rounded-md object-contain" />
            <span className="font-bold tracking-tight text-lg text-sury-slate">sury</span>
          </div>
        </div>
        <WalletButton />
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop & Drawer Sidebar */}
      <aside
        className={`lg:static fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <img
              src="/sury-icon.png"
              alt="SURY Logo"
              className="w-8 h-8 rounded-lg object-contain shadow-sm border border-slate-100"
            />
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold tracking-tight text-xl text-sury-slate">sury</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sury-primary-light text-sury-primary">
                OS
              </span>
            </div>
          </div>
          <button
            className="lg:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <Nav />

        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                wallet.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            <span className="mono font-medium text-slate-700">{botChain.name}</span>
          </div>
          <p className="text-[10px] text-slate-400 mono">Chain ID #{botChain.chainId}</p>
        </div>
      </aside>
    </>
  );
}
