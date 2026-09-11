import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, RefreshCw, Package, MapPin, User as UserIcon, Clock, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/Layout';
import { Card, Button, StatusBadge, TransactionBadge, Spinner, EmptyState } from '@/components/ui';
import { InventoryItem, Transaction } from '@/lib/types';
import { formatDateTime, formatDate, formatTime } from '@/lib/format';
import { generateQrDataUrl, validateItemId } from '@/lib/qr';

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('inventory_items').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('transactions')
        .select(`*, inventory_item:inventory_items(item_name, item_id), performer:profiles(name)`)
        .eq('inventory_item_id', id)
        .order('timestamp', { ascending: false }),
    ]).then(([itemRes, txRes]) => {
      setItem(itemRes.data as InventoryItem | null);
      setTransactions((txRes.data as any) ?? []);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (item) {
      generateQrDataUrl(item.item_id, 300).then(setQrDataUrl);
    }
  }, [item]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrDataUrl) return;
    printWindow.document.write(`
      <html>
        <head><title>MHSA QR Label — ${item?.item_id}</title>
        <style>
          * { font-family: 'Arial', sans-serif; }
          body { display:flex; align-items:center; justify-content:center; padding:40px; }
          .label { width: 300px; text-align: center; border: 2px solid #0f172a; border-radius: 12px; padding: 24px; }
          .header { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-bottom: 12px; color:#0f172a; }
          .name { font-size: 16px; font-weight: 600; margin-bottom: 4px; color:#334155; }
          .id { font-size: 14px; font-family: monospace; margin-bottom: 16px; color:#64748b; }
          img { width: 200px; height: 200px; }
        </style>
        </head>
        <body>
          <div class="label">
            <div class="header">MHSA STORAGE</div>
            <div class="name">${item?.item_name}</div>
            <div class="id">${item?.item_id}</div>
            <img src="${qrDataUrl}" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${item?.item_id}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!item) {
    return (
      <div>
        <PageHeader title="Item Not Found" />
        <EmptyState
          title="Item not found"
          message="This item may have been deleted or the ID is invalid."
          action={<Button onClick={() => navigate('/inventory')}>Back to Inventory</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/inventory" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </Link>
      </div>
      <PageHeader
        title={item.item_name}
        subtitle={`${item.item_id} · ${item.category}`}
        action={
          <StatusBadge status={item.status} destination={item.status === 'AVAILABLE' ? 'Storage' : item.current_destination} />
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Info + QR */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Item Information</h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Item ID" value={item.item_id} mono />
              <InfoRow label="Category" value={item.category} />
              <InfoRow label="Total Quantity" value={`${item.quantity} ${item.unit}`} />
              <InfoRow label="Available" value={`${item.available_quantity} ${item.unit}`} highlight="emerald" />
              {item.released_quantity > 0 && (
                <InfoRow label="Released" value={`${item.released_quantity} ${item.unit}`} highlight="amber" />
              )}
              <InfoRow label="Unit" value={item.unit} />
              {item.notes && <InfoRow label="Notes" value={item.notes} />}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">QR Code</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <Button variant="ghost" size="sm" onClick={handlePrint}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
              </div>
            </div>
            {qrDataUrl ? (
              <div className="flex flex-col items-center">
                <img src={qrDataUrl} alt={`QR code for ${item.item_id}`} className="w-48 h-48" />
                <div className="mt-3 text-center">
                  <div className="text-sm font-bold text-slate-900 tracking-wide">MHSA STORAGE</div>
                  <div className="text-sm text-slate-600">{item.item_name}</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">{item.item_id}</div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8"><Spinner /></div>
            )}
          </Card>
        </div>

        {/* Right: Status + Transactions */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Current Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={item.status} size="sm" />
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Location:</span>
                <span className="font-medium text-slate-900">
                  {item.status === 'AVAILABLE' ? 'Storage' : item.current_destination}
                </span>
              </div>
              {item.current_holder && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Holder:</span>
                  <span className="font-medium text-slate-900">{item.current_holder}</span>
                </div>
              )}
              {item.released_at && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Released:</span>
                  <span className="font-medium text-slate-900">{formatDateTime(item.released_at)}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Transaction History</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No transactions recorded.</p>
            ) : (
              <div className="relative space-y-4">
                {transactions.map((tx, i) => (
                  <div key={tx.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-slate-700' : 'bg-slate-300'}`} />
                      {i < transactions.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <TransactionBadge type={tx.transaction_type} />
                        {tx.quantity > 0 && (
                          <span className="text-xs text-slate-500">{tx.quantity} {item.unit}</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-700">
                        {tx.person_name && <span>To: <span className="font-medium">{tx.person_name}</span> · </span>}
                        {tx.destination && <span>{tx.destination}</span>}
                      </div>
                      {tx.notes && <div className="text-xs text-slate-400 mt-1">{tx.notes}</div>}
                      <div className="text-xs text-slate-400 mt-1">
                        {formatDate(tx.timestamp)} · {formatTime(tx.timestamp)}
                        {tx.performer?.name && ` · by ${tx.performer.name}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: 'emerald' | 'amber' }) {
  const color = highlight === 'emerald' ? 'text-emerald-600' : highlight === 'amber' ? 'text-amber-600' : 'text-slate-900';
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`font-medium text-right ${color} ${mono ? 'font-mono text-sm' : ''}`}>{value}</span>
    </div>
  );
}
