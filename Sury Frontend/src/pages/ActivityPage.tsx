import { Activity as ActivityIcon } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { PageContainer, EmptyState, StatusBadge, SkeletonCard, WalletBanner } from '@/components/ui';
import { walletService } from '@/services/walletService';
import type { Activity } from '@/types';

export function ActivityPage() {
  const { activity, loading, wallet } = useSury();

  const disconnected = wallet.status !== 'connected';

  return (
    <PageContainer title="Activity" subtitle="On-chain events from the SURY protocol">
      {disconnected && <WalletBanner message="Connect your wallet to view protocol activity." />}
      {loading.activity && !disconnected ? <div className="space-y-3">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>
        : activity.length === 0 ? <EmptyState icon={ActivityIcon} title="No activity yet" description="Treasury, agent, policy, and payment events will appear here as they occur on-chain." />
        : <div className="space-y-2">{activity.map(a => <ActivityRow key={a.id} item={a} />)}</div>}
    </PageContainer>
  );
}

function ActivityRow({ item }: { item: Activity }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-4 text-sm">
      <StatusBadge status={item.status} />
      <span className="text-stone-700 flex-1 truncate">{item.label}</span>
      <span className="text-xs text-stone-400 mono shrink-0">{item.createdAt}</span>
      {item.transactionHash && <a href={walletService.getExplorerTxUrl(item.transactionHash)} target="_blank" rel="noreferrer" className="text-xs text-stone-500 hover:text-stone-900 mono shrink-0">{item.transactionHash.slice(0,8)}...</a>}
    </div>
  );
}
