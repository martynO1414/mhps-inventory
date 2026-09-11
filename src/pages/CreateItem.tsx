import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Card, Button, Input, Select, TextArea, ErrorBanner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { createInventoryItem } from '@/lib/inventory';
import { CATEGORIES } from '@/lib/types';

export default function CreateItem() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('General');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('ea');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }
    setSubmitting(true);
    const { item, error } = await createInventoryItem({
      item_name: itemName.trim(),
      category,
      quantity: qty,
      unit: unit.trim() || 'ea',
      notes: notes.trim(),
      created_by: profile?.id ?? '',
    });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    if (item) {
      navigate(`/item/${item.id}`);
    }
  };

  return (
    <div>
      <PageHeader title="Create Item" subtitle="Add new equipment to the storage system" />

      <Card className="p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <Input
            label="Item Name"
            value={itemName}
            onChange={setItemName}
            required
            placeholder="e.g. Training Cones — Box 01"
          />

          <Select
            label="Category"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" value={quantity} onChange={setQuantity} required />
            <Input label="Unit" value={unit} onChange={setUnit} placeholder="ea, box, set" />
          </div>

          <TextArea label="Notes" value={notes} onChange={setNotes} placeholder="Any additional details about this item..." />

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            A unique item ID (e.g. MHSA-000001) and QR code will be generated automatically.
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" size="lg" disabled={submitting}>
              <PlusCircle className="w-5 h-5" />
              {submitting ? 'Creating...' : 'Create Item'}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/inventory')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
