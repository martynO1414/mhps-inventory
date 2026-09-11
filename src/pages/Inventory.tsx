import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, PlusCircle, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/Layout';
import { Card, Button, StatusBadge, EmptyState, Spinner, Select } from '@/components/ui';
import { InventoryItem, CATEGORIES } from '@/lib/types';
import { formatDate, relativeTime } from '@/lib/format';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data as InventoryItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !item.item_name.toLowerCase().includes(q) &&
          !item.item_id.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, search, statusFilter, categoryFilter]);

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
        title="Inventory"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} total`}
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
          icon={<Package className="w-16 h-16" />}
          title="No inventory items yet"
          message="Start by creating your first equipment item in the storage system."
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
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or item ID..."
                className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'RELEASED', label: 'Released' },
              ]}
              className="sm:w-40"
            />
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Categories' },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
              className="sm:w-44"
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-400">
              No items match your filters.
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <Link key={item.id} to={`/item/${item.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{item.item_id}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{item.category}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {item.item_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {item.available_quantity}/{item.quantity} {item.unit} available
                          {item.status === 'RELEASED' && ` · ${item.current_holder}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge status={item.status} destination={item.status === 'AVAILABLE' ? 'Storage' : item.current_destination} size="sm" />
                        <span className="text-[10px] text-slate-400">{relativeTime(item.updated_at)}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
