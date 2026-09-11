import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, CheckCircle2, ArrowUpRight, ArrowDownRight, Activity as ActivityIcon, PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Card, Button, StatusBadge, TransactionBadge, EmptyState, Spinner } from '@/components/ui';
import { fetchDashboardStats } from '@/lib/inventory';
import { formatDateTime, relativeTime } from '@/lib/format';
import { InventoryItem, Transaction } from '@/lib/types';

export default function Dashboard() {
  const [stats, setStats] = useState<{
    total: number;
    available: number;
    released: number;
    releasedItems: InventoryItem[];
    recentActivity: Transaction[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats().then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!stats) return null;

  if (stats.total === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="MHSA storage overview" />
        <EmptyState
          icon={<Package className="w-16 h-16" />}
          title="Your storage system is ready"
          message="Create your first inventory item to get started with tracking equipment."
          action={
            <Link to="/create">
              <Button size="lg">
                <PlusCircle className="w-5 h-5" />
                Create First Item
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="MHSA storage overview"
        action={
          <Link to="/scan">
            <Button size="md">
              <ArrowUpRight className="w-4 h-4" />
              Scan Equipment
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Available</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.available}</div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Released</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.released}</div>
        </Card>
      </div>

      {/* Currently Released */}
      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Currently Released
          </h2>
        </div>
        {stats.releasedItems.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            All equipment is in storage.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.releasedItems.map((item) => (
              <Link
                key={item.id}
                to={`/item/${item.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 truncate">{item.item_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.released_quantity} {item.unit} · {item.current_holder} ·{' '}
                    {item.current_destination}
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <div className="text-xs text-slate-400">{relativeTime(item.released_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Recent Activity</h2>
          <Link to="/activity" className="text-xs font-medium text-slate-500 hover:text-slate-700">
            View all
          </Link>
        </div>
        {stats.recentActivity.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon className="w-12 h-12" />}
            title="No equipment activity yet"
            message="Transactions will appear here once you start checking equipment in and out."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentActivity.map((tx) => (
              <div key={tx.id} className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5">
                  {tx.transaction_type === 'RETURNED' ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TransactionBadge type={tx.transaction_type} />
                    <span className="text-sm font-medium text-slate-900">
                      {tx.inventory_item?.item_name ?? 'Unknown item'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {tx.quantity > 0 && `${tx.quantity} · `}
                    {tx.person_name && `${tx.person_name} · `}
                    {tx.destination}
                  </div>
                </div>
                <div className="text-xs text-slate-400 shrink-0 mt-0.5">
                  {formatDateTime(tx.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
