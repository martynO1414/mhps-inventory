export type ItemStatus = 'AVAILABLE' | 'RELEASED';

export type TransactionType =
  | 'CREATED'
  | 'CHECKED_OUT'
  | 'RETURNED'
  | 'RELEASED_TO_ANOTHER_TEAM'
  | 'UPDATED'
  | 'QUANTITY_UPDATED';

export type DestinationOption =
  | 'My Team'
  | 'Another Team'
  | 'Training'
  | 'Game'
  | 'Event'
  | 'Other';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  item_id: string;
  item_name: string;
  category: string;
  quantity: number;
  available_quantity: number;
  released_quantity: number;
  unit: string;
  notes: string;
  status: ItemStatus;
  current_holder: string;
  current_destination: string;
  released_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryHolding {
  id: string;
  inventory_item_id: string;
  location_type: 'STORAGE' | 'RELEASED';
  quantity: number;
  holder: string;
  destination: string;
  created_at: string;
  updated_at: string;
}

export interface QrCode {
  id: string;
  inventory_item_id: string;
  code_data: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  inventory_item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  person_name: string;
  user_id: string | null;
  destination: string;
  notes: string;
  timestamp: string;
  created_at: string;
  inventory_item?: Pick<InventoryItem, 'item_name' | 'item_id'>;
  performer?: Pick<Profile, 'name'> | null;
}

export const DESTINATION_OPTIONS: DestinationOption[] = [
  'My Team',
  'Another Team',
  'Training',
  'Game',
  'Event',
  'Other',
];

export const CATEGORIES = [
  'Balls',
  'Cones',
  'Bibs',
  'Goals',
  'Nets',
  'Training Equipment',
  'Match Equipment',
  'Medical',
  'Office',
  'General',
];
