import { useState } from 'react';
import { SuryProvider } from '@/store/SuryContext';
import { ToastProvider } from '@/components/Toast';
import { Sidebar } from '@/components/Sidebar';
import { WalletButton } from '@/components/ui';
import { OverviewPage } from '@/pages/OverviewPage';
import { TreasuryPage } from '@/pages/TreasuryPage';
import { AgentsPage } from '@/pages/AgentsPage';
import { PoliciesPage } from '@/pages/PoliciesPage';
import { TasksPage } from '@/pages/TasksPage';
import { ReceiptsPage } from '@/pages/ReceiptsPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { botChain, type RouteId } from '@/config';

function Shell() {
  const [route, setRoute] = useState<RouteId>('overview');

  return (
    <div className="flex h-screen bg-stone-50 font-sans antialiased selection:bg-stone-900 selection:text-white">
      <Sidebar route={route} onNavigate={setRoute} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden lg:flex items-center justify-between h-16 border-b border-stone-200/80 bg-white/80 backdrop-blur-md px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {botChain.name} (#{botChain.chainId})
            </span>
            <span className="hidden xl:inline text-xs text-stone-400 font-mono">
              Treasury: {botChain.contracts.treasury.slice(0, 6)}...{botChain.contracts.treasury.slice(-4)}
            </span>
          </div>
          <WalletButton />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          {route === 'overview' && <OverviewPage onNavigate={setRoute} />}
          {route === 'treasury' && <TreasuryPage />}
          {route === 'agents' && <AgentsPage onNavigate={setRoute} />}
          {route === 'policies' && <PoliciesPage />}
          {route === 'tasks' && <TasksPage />}
          {route === 'receipts' && <ReceiptsPage />}
          {route === 'activity' && <ActivityPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SuryProvider>
        <Shell />
      </SuryProvider>
    </ToastProvider>
  );
}

