import { useState } from 'react';
import { LayoutDashboard, Wallet, Users, ShieldCheck, ListTodo, ReceiptText, Activity, Menu, X } from 'lucide-react';
import { navigation, type RouteId, botChain } from '@/config';
import { WalletButton } from '@/components/ui';
import { useSury } from '@/store/SuryContext';

const icons: Record<RouteId, any> = {
  overview: LayoutDashboard, treasury: Wallet, agents: Users, policies: ShieldCheck, tasks: ListTodo, receipts: ReceiptText, activity: Activity,
};

export function Sidebar({ route, onNavigate }: { route: RouteId; onNavigate: (r: RouteId) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { wallet } = useSury();
  const sections = Array.from(new Set(navigation.map(n => n.section)));

  const Nav = () => (
    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
      {sections.map(sec => (
        <div key={sec}>
          <p className="px-3 text-[10px] uppercase tracking-widest text-stone-400 mb-2">{sec}</p>
          <div className="space-y-0.5">
            {navigation.filter(n => n.section === sec).map(n => {
              const Icon = icons[n.id];
              const active = route === n.id;
              return (
                <button key={n.id} onClick={() => { onNavigate(n.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                  <Icon size={17} /> {n.label}
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-200 flex items-center justify-between px-4 h-14">
        <button onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <span className="font-bold tracking-tight">SURY</span>
        <WalletButton />
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)} />}

      <aside className={`lg:static fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-14 flex items-center justify-between px-5 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold tracking-tight text-lg">SURY</span>
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <Nav />
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full ${wallet.status === 'connected' ? 'bg-emerald-500' : 'bg-stone-300'}`} />
            <span className="mono">{botChain.name}</span>
          </div>
          <p className="text-[10px] text-stone-400 mono">Chain ID {botChain.chainId}</p>
        </div>
      </aside>
    </>
  );
}
