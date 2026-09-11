import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity as ActivityIcon, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/Layout';
import { Card, TransactionBadge, EmptyState, Spinner, Select } from '@/components/ui';
import { Transaction, TransactionType } from '@/lib/types';
import { formatDateTime, formatDate } from '@/lib/format';

const TX_TYPES: TransactionType[] = [
  'CREATED',
  'CHECKED_OUT',
  'RETURNED',
  'RELEASED_TO_ANOTHER_TEAM',
  'UPDATED',
  'QUANTITY_UPDATED',
];

export default function Activity() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    supabase
      .from('transactions')
      .select(`*, inventory_item:inventory_items(item_name, item_id), performer:profiles(name)`)
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setTransactions((data as any) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) return false;
      if (dateFilter) {
        const txDate = formatDate(tx.timestamp);
        const filterDate = formatDate(dateFilter);
        if (txDate !== filterDate) return false;
      }
      if (itemFilter.trim()) {
        const q = itemFilter.trim().toLowerCase();
        if (
          !tx.inventory_item?.item_name?.toLowerCase().includes(q) &&
          !tx.inventory_item?.item_id?.toLowerCase().includes(q)
        )
          return false;
      }
      if (personFilter.trim()) {
        const q = personFilter.trim().toLowerCase();
        if (
          !tx.person_name?.toLowerCase().includes(q) &&
          !tx.performer?.name?.toLowerCase().includes(q)
        )
          return false;
      }
      if (destinationFilter.trim()) {
        const q = destinationFilter.trim().toLowerCase();
        if (!tx.destination?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, dateFilter, itemFilter, personFilter, destinationFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Activity" subtitle={`${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`} />

      {transactions.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="w-16 h-16" />}
          title="No equipment activity yet"
          message="Transactions will appear here once equipment is created, checked out, returned, or transferred."
        />
      ) : (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              type="text"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              placeholder="Item name or ID"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              type="text"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              placeholder="Person"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              type="text"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              placeholder="Destination"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'ALL', label: 'All Types' },
                ...TX_TYPES.map((t) => ({
                  value: t,
                  label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                })),
              ]}
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-400">
              No transactions match your filters.
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-slate-100">
                {filtered.map((tx) => (
                  <div key={tx.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <TransactionBadge type={tx.transaction_type} />
                          {tx.inventory_item && (
                            <Link
                              to={`/item/${tx.inventory_item_id}`}
                              className="text-sm font-medium text-slate-900 hover:underline"
                            >
                              {tx.inventory_item.item_name}
                            </Link>
                          )}
                          {tx.quantity > 0 && (
                            <span className="text-xs text-slate-500">{tx.quantity}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {tx.person_name && <span>Person: {tx.person_name}</span>}
                          {tx.person_name && tx.destination && ' · '}
                          {tx.destination && <span>{tx.destination}</span>}
                          {tx.performer?.name && (
                            <span className="text-slate-400"> · by {tx.performer.name}</span>
                          )}
                        </div>
                        {tx.notes && <div className="text-xs text-slate-400 mt-1">{tx.notes}</div>}
                      </div>
                      <div className="text-xs text-slate-400 shrink-0 mt-0.5">
                        {formatDateTime(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
