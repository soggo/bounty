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

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

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
