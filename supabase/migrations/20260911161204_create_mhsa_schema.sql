/*
# MHSA Storage Manager — Core Schema

1. Overview
   Creates the full relational schema for the Medicine Hat Soccer Association
   equipment & property management system. All inventory, transactions, QR
   codes, and user profiles are stored here. Authentication uses Supabase
   Auth (auth.users). The schema is designed so roles/permissions, multiple
   storage locations, teams, and audit logs can be added later without
   restructuring.

2. New Tables
   - `profiles` — application-specific profile linked 1:1 to auth.users.
     Fields: id (uuid, pk, == auth.users.id), name, email, role (text, default 'user'),
     created_at, updated_at.
   - `inventory_items` — physical equipment records.
     Fields: id (uuid pk), item_id (unique text e.g. MHSA-000001), item_name, category,
     quantity (numeric), available_quantity (numeric — qty currently in storage),
     released_quantity (numeric — qty currently outside storage), unit, notes,
     status (text: AVAILABLE / RELEASED), current_holder, current_destination,
     released_at (timestamptz), created_by (uuid -> profiles.id), created_at, updated_at.
   - `inventory_holdings` — tracks quantities of an item at a location/holder.
     Fields: id (uuid pk), inventory_item_id (uuid -> inventory_items.id),
     location_type (text: STORAGE / RELEASED), quantity (numeric), holder, destination,
     created_at, updated_at. This enables accurate partial-quantity tracking.
   - `qr_codes` — QR identifier for each inventory item.
     Fields: id (uuid pk), inventory_item_id (uuid -> inventory_items.id, unique),
     code_data (text — the item_id encoded), created_at.
   - `transactions` — permanent, append-only history of every equipment movement.
     Fields: id (uuid pk), inventory_item_id (uuid -> inventory_items.id),
     transaction_type (text: CREATED / CHECKED_OUT / RETURNED /
     RELEASED_TO_ANOTHER_TEAM / UPDATED / QUANTITY_UPDATED),
     quantity (numeric), person_name, user_id (uuid -> profiles.id — who performed action),
     destination, notes, timestamp (timestamptz), created_at.

3. Security
   - RLS enabled on ALL tables.
   - profiles: authenticated users can read/update only their own profile.
   - inventory_items, inventory_holdings, qr_codes, transactions:
     authenticated users get full CRUD (shared operational data — all authenticated
     staff manage the same equipment cage). This is intentional shared access, not
     a per-user isolation model. Role column on profiles is ready for future
     permission gating.

4. Important Notes
   - `item_id` is unique and human-readable (MHSA-000001). A sequence + function
     generates the next ID automatically.
   - `available_quantity` + `released_quantity` allow partial checkouts without
     overwriting the original `quantity`.
   - `inventory_holdings` provides the detailed per-location breakdown.
   - transactions are append-only by design — the app never UPDATEs or DELETEs them.
   - All timestamp fields default to now().
*/

-- ========== PROFILES ==========
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ========== ITEM ID SEQUENCE ==========
CREATE SEQUENCE IF NOT EXISTS mhsa_item_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_item_id()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'MHSA-' || lpad(nextval('mhsa_item_id_seq')::text, 6, '0');
$$;

-- ========== INVENTORY ITEMS ==========
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text UNIQUE NOT NULL DEFAULT generate_item_id(),
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  quantity numeric NOT NULL DEFAULT 0,
  available_quantity numeric NOT NULL DEFAULT 0,
  released_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ea',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'AVAILABLE',
  current_holder text NOT NULL DEFAULT '',
  current_destination text NOT NULL DEFAULT 'Storage',
  released_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select_auth" ON inventory_items;
CREATE POLICY "inventory_select_auth" ON inventory_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_insert_auth" ON inventory_items;
CREATE POLICY "inventory_insert_auth" ON inventory_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_update_auth" ON inventory_items;
CREATE POLICY "inventory_update_auth" ON inventory_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_delete_auth" ON inventory_items;
CREATE POLICY "inventory_delete_auth" ON inventory_items FOR DELETE
  TO authenticated USING (true);

-- ========== INVENTORY HOLDINGS ==========
CREATE TABLE IF NOT EXISTS inventory_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_type text NOT NULL DEFAULT 'STORAGE',
  quantity numeric NOT NULL DEFAULT 0,
  holder text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT 'Storage',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holdings_select_auth" ON inventory_holdings;
CREATE POLICY "holdings_select_auth" ON inventory_holdings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "holdings_insert_auth" ON inventory_holdings;
CREATE POLICY "holdings_insert_auth" ON inventory_holdings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "holdings_update_auth" ON inventory_holdings;
CREATE POLICY "holdings_update_auth" ON inventory_holdings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "holdings_delete_auth" ON inventory_holdings;
CREATE POLICY "holdings_delete_auth" ON inventory_holdings FOR DELETE
  TO authenticated USING (true);

-- ========== QR CODES ==========
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
  code_data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_select_auth" ON qr_codes;
CREATE POLICY "qr_select_auth" ON qr_codes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "qr_insert_auth" ON qr_codes;
CREATE POLICY "qr_insert_auth" ON qr_codes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "qr_update_auth" ON qr_codes;
CREATE POLICY "qr_update_auth" ON qr_codes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "qr_delete_auth" ON qr_codes;
CREATE POLICY "qr_delete_auth" ON qr_codes FOR DELETE
  TO authenticated USING (true);

-- ========== TRANSACTIONS ==========
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  person_name text NOT NULL DEFAULT '',
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  destination text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tx_select_auth" ON transactions;
CREATE POLICY "tx_select_auth" ON transactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "tx_insert_auth" ON transactions;
CREATE POLICY "tx_insert_auth" ON transactions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tx_update_auth" ON transactions;
CREATE POLICY "tx_update_auth" ON transactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tx_delete_auth" ON transactions;
CREATE POLICY "tx_delete_auth" ON transactions FOR DELETE
  TO authenticated USING (true);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_item_id ON inventory_items(item_id);
CREATE INDEX IF NOT EXISTS idx_holdings_item ON inventory_holdings(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_tx_item ON transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);

-- ========== UPDATED_AT TRIGGER ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated ON inventory_items;
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_holdings_updated ON inventory_holdings;
CREATE TRIGGER trg_holdings_updated BEFORE UPDATE ON inventory_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== AUTO-CREATE PROFILE ON SIGNUP ==========
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();