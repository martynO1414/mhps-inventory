import { supabase } from '@/lib/supabase';
import { InventoryItem, Transaction, TransactionType, QrCode } from '@/lib/types';

export async function createInventoryItem(params: {
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  notes: string;
  created_by: string;
}): Promise<{ item: InventoryItem | null; error: string | null }> {
  const { data: item, error } = await supabase
    .from('inventory_items')
    .insert({
      item_name: params.item_name,
      category: params.category,
      quantity: params.quantity,
      available_quantity: params.quantity,
      released_quantity: 0,
      unit: params.unit,
      notes: params.notes,
      status: 'AVAILABLE',
      current_destination: 'Storage',
      created_by: params.created_by,
    })
    .select()
    .single();

  if (error) return { item: null, error: error.message };
  const newItem = item as InventoryItem;

  // Create initial storage holding
  await supabase.from('inventory_holdings').insert({
    inventory_item_id: newItem.id,
    location_type: 'STORAGE',
    quantity: params.quantity,
    holder: '',
    destination: 'Storage',
  });

  // Create QR code record
  await supabase.from('qr_codes').insert({
    inventory_item_id: newItem.id,
    code_data: newItem.item_id,
  });

  // Create CREATED transaction
  await createTransaction({
    inventory_item_id: newItem.id,
    transaction_type: 'CREATED',
    quantity: params.quantity,
    person_name: '',
    user_id: params.created_by,
    destination: 'Storage',
    notes: `Item created with ${params.quantity} ${params.unit}`,
  });

  return { item: newItem, error: null };
}

export async function createTransaction(params: {
  inventory_item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  person_name: string;
  user_id: string;
  destination: string;
  notes: string;
}): Promise<void> {
  await supabase.from('transactions').insert({
    inventory_item_id: params.inventory_item_id,
    transaction_type: params.transaction_type,
    quantity: params.quantity,
    person_name: params.person_name,
    user_id: params.user_id,
    destination: params.destination,
    notes: params.notes,
    timestamp: new Date().toISOString(),
  });
}

export async function checkOutItem(params: {
  item: InventoryItem;
  person_name: string;
  destination: string;
  checkoutQty: number;
  notes: string;
  user_id: string;
}): Promise<{ error: string | null }> {
  const { item, person_name, destination, checkoutQty, notes, user_id } = params;

  if (checkoutQty <= 0) return { error: 'Quantity must be greater than zero' };
  if (checkoutQty > item.available_quantity) {
    return { error: `Cannot check out ${checkoutQty} — only ${item.available_quantity} available` };
  }

  const newAvailable = item.available_quantity - checkoutQty;
  const newReleased = item.released_quantity + checkoutQty;
  const allReleased = newAvailable === 0;
  const partialRelease = newAvailable > 0;

  const newStatus = 'RELEASED';
  const newDestination = allReleased ? destination : `${destination} (partial — ${newAvailable} ${item.unit} remain in storage)`;

  const { error: updateErr } = await supabase
    .from('inventory_items')
    .update({
      available_quantity: newAvailable,
      released_quantity: newReleased,
      status: newStatus,
      current_holder: person_name,
      current_destination: newDestination,
      released_at: new Date().toISOString(),
    })
    .eq('id', item.id);

  if (updateErr) return { error: updateErr.message };

  // Update holdings: reduce storage holding
  const { data: storageHolding } = await supabase
    .from('inventory_holdings')
    .select('*')
    .eq('inventory_item_id', item.id)
    .eq('location_type', 'STORAGE')
    .maybeSingle();

  if (storageHolding) {
    const remaining = (storageHolding as any).quantity - checkoutQty;
    if (remaining <= 0) {
      await supabase.from('inventory_holdings').delete().eq('id', (storageHolding as any).id);
    } else {
      await supabase
        .from('inventory_holdings')
        .update({ quantity: remaining })
        .eq('id', (storageHolding as any).id);
    }
  }

  // Create released holding
  await supabase.from('inventory_holdings').insert({
    inventory_item_id: item.id,
    location_type: 'RELEASED',
    quantity: checkoutQty,
    holder: person_name,
    destination,
  });

  const txNotes = partialRelease
    ? `${notes} (Partial: ${checkoutQty} of ${item.available_quantity} checked out, ${remaining_after(item.available_quantity, checkoutQty)} remain in storage)`.trim()
    : notes;

  await createTransaction({
    inventory_item_id: item.id,
    transaction_type: 'CHECKED_OUT',
    quantity: checkoutQty,
    person_name,
    user_id,
    destination,
    notes: txNotes,
  });

  return { error: null };
}

function remaining_after(avail: number, checkout: number): number {
  return avail - checkout;
}

export async function returnItem(params: {
  item: InventoryItem;
  returnQty: number;
  notes: string;
  user_id: string;
}): Promise<{ error: string | null }> {
  const { item, returnQty, notes, user_id } = params;

  if (returnQty <= 0) return { error: 'Quantity must be greater than zero' };
  if (returnQty > item.released_quantity) {
    return { error: `Cannot return ${returnQty} — only ${item.released_quantity} currently released` };
  }

  const newAvailable = item.available_quantity + returnQty;
  const newReleased = item.released_quantity - returnQty;
  const allReturned = newReleased === 0;

  const newStatus = allReturned ? 'AVAILABLE' : 'RELEASED';
  const newHolder = allReturned ? '' : item.current_holder;
  const newDestination = allReturned ? 'Storage' : item.current_destination;
  const newReleasedAt = allReturned ? null : item.released_at;

  const { error: updateErr } = await supabase
    .from('inventory_items')
    .update({
      available_quantity: newAvailable,
      released_quantity: newReleased,
      status: newStatus,
      current_holder: newHolder,
      current_destination: newDestination,
      released_at: newReleasedAt,
    })
    .eq('id', item.id);

  if (updateErr) return { error: updateErr.message };

  // Update holdings: find the released holding and reduce it
  const { data: releasedHoldings } = await supabase
    .from('inventory_holdings')
    .select('*')
    .eq('inventory_item_id', item.id)
    .eq('location_type', 'RELEASED');

  let qtyToProcess = returnQty;
  if (releasedHoldings) {
    for (const h of releasedHoldings as any[]) {
      if (qtyToProcess <= 0) break;
      const holdingQty = h.quantity;
      if (holdingQty <= qtyToProcess) {
        await supabase.from('inventory_holdings').delete().eq('id', h.id);
        qtyToProcess -= holdingQty;
      } else {
        await supabase
          .from('inventory_holdings')
          .update({ quantity: holdingQty - qtyToProcess })
          .eq('id', h.id);
        qtyToProcess = 0;
      }
    }
  }

  // Add to storage holding
  const { data: storageHolding } = await supabase
    .from('inventory_holdings')
    .select('*')
    .eq('inventory_item_id', item.id)
    .eq('location_type', 'STORAGE')
    .maybeSingle();

  if (storageHolding) {
    await supabase
      .from('inventory_holdings')
      .update({ quantity: (storageHolding as any).quantity + returnQty })
      .eq('id', (storageHolding as any).id);
  } else {
    await supabase.from('inventory_holdings').insert({
      inventory_item_id: item.id,
      location_type: 'STORAGE',
      quantity: returnQty,
      holder: '',
      destination: 'Storage',
    });
  }

  await createTransaction({
    inventory_item_id: item.id,
    transaction_type: 'RETURNED',
    quantity: returnQty,
    person_name: item.current_holder,
    user_id,
    destination: 'Storage',
    notes,
  });

  return { error: null };
}

export async function transferItem(params: {
  item: InventoryItem;
  new_person: string;
  new_destination: string;
  transferQty: number;
  notes: string;
  user_id: string;
}): Promise<{ error: string | null }> {
  const { item, new_person, new_destination, transferQty, notes, user_id } = params;

  if (transferQty <= 0) return { error: 'Quantity must be greater than zero' };
  if (transferQty > item.released_quantity) {
    return { error: `Cannot transfer ${transferQty} — only ${item.released_quantity} currently released` };
  }

  const { error: updateErr } = await supabase
    .from('inventory_items')
    .update({
      current_holder: new_person,
      current_destination: new_destination,
      released_at: new Date().toISOString(),
    })
    .eq('id', item.id);

  if (updateErr) return { error: updateErr.message };

  // Update holdings: replace released holdings with new person
  const { data: releasedHoldings } = await supabase
    .from('inventory_holdings')
    .select('*')
    .eq('inventory_item_id', item.id)
    .eq('location_type', 'RELEASED');

  if (releasedHoldings) {
    for (const h of releasedHoldings as any[]) {
      await supabase.from('inventory_holdings').delete().eq('id', h.id);
    }
  }

  await supabase.from('inventory_holdings').insert({
    inventory_item_id: item.id,
    location_type: 'RELEASED',
    quantity: transferQty,
    holder: new_person,
    destination: new_destination,
  });

  await createTransaction({
    inventory_item_id: item.id,
    transaction_type: 'RELEASED_TO_ANOTHER_TEAM',
    quantity: transferQty,
    person_name: new_person,
    user_id,
    destination: new_destination,
    notes,
  });

  return { error: null };
}

export async function findItemByItemId(itemId: string): Promise<{ item: InventoryItem | null; error: string | null }> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data as InventoryItem | null, error: null };
}

export async function fetchTransactions(itemId: string): Promise<Transaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select(`
      *,
      inventory_item:inventory_items(item_name, item_id),
      performer:profiles(name)
    `)
    .eq('inventory_item_id', itemId)
    .order('timestamp', { ascending: false });
  return (data as any) ?? [];
}

export async function fetchAllTransactions(limit = 100): Promise<Transaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select(`
      *,
      inventory_item:inventory_items(item_name, item_id),
      performer:profiles(name)
    `)
    .order('timestamp', { ascending: false })
    .limit(limit);
  return (data as any) ?? [];
}

export async function fetchQrCode(itemId: string): Promise<QrCode | null> {
  const { data } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('inventory_item_id', itemId)
    .maybeSingle();
  return data as QrCode | null;
}

export async function regenerateQrCode(itemId: string): Promise<void> {
  // QR code data is the item_id, so regeneration just confirms the record exists
  const { data: existing } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('inventory_item_id', itemId)
    .maybeSingle();
  if (!existing) {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('item_id')
      .eq('id', itemId)
      .maybeSingle();
    if (item) {
      await supabase.from('qr_codes').insert({
        inventory_item_id: itemId,
        code_data: (item as any).item_id,
      });
    }
  }
}

export async function fetchDashboardStats(): Promise<{
  total: number;
  available: number;
  released: number;
  releasedItems: InventoryItem[];
  recentActivity: Transaction[];
}> {
  const { count: total } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true });

  const { count: available } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'AVAILABLE');

  const { count: released } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'RELEASED');

  const { data: releasedItems } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('status', 'RELEASED')
    .order('released_at', { ascending: false });

  const recentActivity = await fetchAllTransactions(10);

  return {
    total: total ?? 0,
    available: available ?? 0,
    released: released ?? 0,
    releasedItems: (releasedItems as InventoryItem[]) ?? [],
    recentActivity,
  };
}
