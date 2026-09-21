import { ReceiptText, ExternalLink, Check, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useSury } from '@/store/SuryContext';
import { PageContainer, EmptyState, SkeletonCard, WalletBanner } from '@/components/ui';
import { walletService } from '@/services/walletService';
import type { Receipt } from '@/types';

export function ReceiptsPage() {
  const { receipts, loading, wallet } = useSury();

  const disconnected = wallet.status !== 'connected';

  return (
    <PageContainer title="Receipts" subtitle="Verifiable settlement receipts">
      {disconnected && <WalletBanner message="Connect your wallet to view settlement receipts." />}
      {loading.receipts && !disconnected ? <div className="space-y-3">{[0,1].map(i => <SkeletonCard key={i} />)}</div>
        : receipts.length === 0 ? <EmptyState icon={ReceiptText} title="No settlements yet" description="Receipts are generated after payments are confirmed on BOT Chain." />
        : <div className="space-y-4">{receipts.map(r => <ReceiptCard key={r.id} receipt={r} />)}</div>}
    </PageContainer>
  );
}

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-b border-emerald-100">
        <Check size={18} className="text-emerald-700" />
        <span className="font-semibold text-emerald-800">SETTLED</span>
      </div>
      <div className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <Row label="Task" value={receipt.taskId} />
        <Row label="Agent" value={receipt.agentId} />
        <Row label="Treasury" value={receipt.treasuryId} />
        <Row label="Amount" value={`${receipt.amount} ${receipt.token}`} />
        <Row label="Recipient" value={receipt.recipient} />
        <Row label="Timestamp" value={receipt.timestamp} />
        <Row label="Policy" value={receipt.policyId} />
        <div className="sm:col-span-2 flex items-center justify-between pt-3 border-t border-stone-100 mt-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-0.5">Transaction Hash</p>
            <p className="mono text-sm truncate">{receipt.transactionHash}</p>
          </div>
          <a href={walletService.getExplorerTxUrl(receipt.transactionHash)} target="_blank" rel="noreferrer" className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5 shrink-0 ml-4">
            <ExternalLink size={15} /> View on BOT Chain
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-stone-500 shrink-0">{label}</span><span className="mono text-right truncate">{value}</span></div>;
}
