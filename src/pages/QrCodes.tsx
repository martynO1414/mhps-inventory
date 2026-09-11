import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode as QrIcon, Printer, Download, PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/Layout';
import { Card, Button, StatusBadge, EmptyState, Spinner } from '@/components/ui';
import { InventoryItem } from '@/lib/types';
import { generateQrDataUrl } from '@/lib/qr';

interface QrItem {
  item: InventoryItem;
  qrDataUrl: string;
}

export default function QrCodes() {
  const [items, setItems] = useState<QrItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const invItems = (data as InventoryItem[]) ?? [];
        const qrItems = await Promise.all(
          invItems.map(async (item) => ({
            item,
            qrDataUrl: await generateQrDataUrl(item.item_id, 200),
          }))
        );
        setItems(qrItems);
        setLoading(false);
      });
  }, []);

  const handlePrint = (item: InventoryItem, qrDataUrl: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>MHSA QR Label — ${item.item_id}</title>
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
            <div class="name">${item.item_name}</div>
            <div class="id">${item.item_id}</div>
            <img src="${qrDataUrl}" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownload = (item: InventoryItem, qrDataUrl: string) => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${item.item_id}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="QR Codes"
        subtitle={`${items.length} code${items.length !== 1 ? 's' : ''}`}
        action={
          <Link to="/create">
            <Button size="md">
              <PlusCircle className="w-4 h-4" />
              Add Item
            </Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<QrIcon className="w-16 h-16" />}
          title="No QR codes have been created yet"
          message="QR codes are generated automatically when you create inventory items."
          action={
            <Link to="/create">
              <Button size="lg">
                <PlusCircle className="w-5 h-5" />
                Create First Item
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ item, qrDataUrl }) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-mono text-slate-400">{item.item_id}</div>
                  <Link to={`/item/${item.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
                    {item.item_name}
                  </Link>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>
              <div className="flex justify-center mb-4">
                <img src={qrDataUrl} alt={`QR for ${item.item_id}`} className="w-36 h-36" />
              </div>
              <div className="text-center mb-3">
                <div className="text-xs font-bold text-slate-900 tracking-wide">MHSA STORAGE</div>
                <div className="text-xs font-mono text-slate-400">{item.item_id}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleDownload(item, qrDataUrl)}>
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handlePrint(item, qrDataUrl)}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
