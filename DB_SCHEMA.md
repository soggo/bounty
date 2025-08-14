# Bounty Database Schema

PostgreSQL schema (works in Supabase) capturing the agreed structure.

## Tables

### products

```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  subtitle VARCHAR(500),
  price INTEGER NOT NULL,         -- in cents; current/sale price
  old_price INTEGER,              -- original price shown when is_sale = true

  -- Inventory & status flags
  stock_quantity INTEGER DEFAULT 0,
  is_sale BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,

  -- Classification
  category_id UUID REFERENCES product_categories(id),
  product_type VARCHAR(100),

  -- Search & media
  tags TEXT[],                    -- for filtering/search
  images JSONB,                   -- array of image URLs/metadata

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Decisions captured:
- No `sku`, `is_active`, `featured_image`, or `sort_order`.
- `is_sale` replaces `is_active`; `is_bestseller` replaces `is_featured`.
- `labels` replaced with `is_new`.

### product_categories

```sql
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Optional indexes

```sql
CREATE INDEX IF NOT EXISTS idx_products_is_bestseller ON products(is_bestseller);
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new);
CREATE INDEX IF NOT EXISTS idx_products_is_sale ON products(is_sale);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
```

## Notes for Supabase
- Run the `product_categories` table first, then `products`.
- If `gen_random_uuid()` is unavailable, enable the `pgcrypto` extension or use `uuid_generate_v4()` with the `uuid-ossp` extension.

---

## User Accounts and Orders

This section adds user accounts (via Supabase Auth + `profiles`), user addresses, and basic orders.

### profiles

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),

  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

Policies for `profiles` (users can see/update their own profile; admins can access all):

```sql
-- Read own profile or any profile if current user is admin
CREATE POLICY profiles_select_own_or_admin
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles AS admin
      WHERE admin.id = auth.uid() AND admin.role = 'admin'
    )
  );

-- Update own profile or any profile if admin
CREATE POLICY profiles_update_own_or_admin
  ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles AS admin
      WHERE admin.id = auth.uid() AND admin.role = 'admin'
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles AS admin
      WHERE admin.id = auth.uid() AND admin.role = 'admin'
    )
  );

-- Inserts are normally handled by the signup trigger below.
-- Allow admins to insert/fix rows when needed.
CREATE POLICY profiles_insert_admin_only
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS admin
      WHERE admin.id = auth.uid() AND admin.role = 'admin'
    )
  );
```

Automatic profile creation on signup:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function runs with the intended schema path
ALTER FUNCTION public.handle_new_user() SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

-- No email column in profiles; use auth.users.email via Auth APIs when needed.

### user_addresses

```sql
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  recipient_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),                 -- optional (not required in NG)
  country_code CHAR(2) NOT NULL DEFAULT 'NG',

  is_default_shipping BOOLEAN DEFAULT false,
  is_default_billing BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Each user can have at most one default shipping and one default billing address
CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_shipping_address_per_user
  ON user_addresses (user_id) WHERE is_default_shipping;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_billing_address_per_user
  ON user_addresses (user_id) WHERE is_default_billing;
```

Policies for `user_addresses` (users manage their own; admins full access):

```sql
CREATE POLICY user_addresses_select_own_or_admin
  ON user_addresses FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY user_addresses_insert_own_or_admin
  ON user_addresses FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY user_addresses_update_own_or_admin
  ON user_addresses FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY user_addresses_delete_own_or_admin
  ON user_addresses FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
```

### orders

```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','cancelled','fulfilled','refunded')),

  currency_code CHAR(3) NOT NULL DEFAULT 'NGN',

  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_total_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,

  payment_provider TEXT,           -- e.g., 'paystack', 'stripe'
  payment_reference TEXT,          -- provider reference/id

  shipping_address_json JSONB,
  billing_address_json JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
```

Policies for `orders` (users can read their own; admin full access; inserts allowed for own user):

```sql
CREATE POLICY orders_select_own_or_admin
  ON orders FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY orders_insert_own_or_admin
  ON orders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Typically, updates are done by server-side code/webhooks using the service role.
-- Allow only admins to update/delete in client context.
CREATE POLICY orders_update_admin_only
  ON orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY orders_delete_admin_only
  ON orders FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

### order_items

```sql
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  product_id UUID REFERENCES products(id),  -- for analytics/tracking; not relied on for pricing
  product_name VARCHAR(255) NOT NULL,       -- snapshot at purchase time
  product_slug VARCHAR(255),                -- snapshot at purchase time

  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_cents INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
```

Policies for `order_items` (derived from parent order ownership):

```sql
-- Read allowed if the parent order is readable
CREATE POLICY order_items_select_via_orders
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND (
        o.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Insert allowed for own orders or admin
CREATE POLICY order_items_insert_via_orders
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND (
        o.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Updates/deletes limited to admin in client context
CREATE POLICY order_items_update_admin_only
  ON order_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY order_items_delete_admin_only
  ON order_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

## Notes
- `postal_code` on `user_addresses` is optional for Nigerian addresses.
- Use `first_name` as the display name in UI; no separate display or avatar fields.
- Orders snapshot pricing and product names/slugs at purchase time to preserve history.
- For production, consider handling order creation and status updates via Edge Functions using the service role (bypasses RLS as needed).
