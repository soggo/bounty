-- CRITICAL SECURITY FIX: Add Row Level Security (RLS) policies for products tables
-- Run these commands in your Supabase SQL Editor

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Enable RLS on product_categories table  
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Products table policies
-- Everyone can read products (public storefront)
CREATE POLICY products_select_public
  ON products FOR SELECT
  USING (true);

-- Only admins can insert products
CREATE POLICY products_insert_admin_only
  ON products FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update products
CREATE POLICY products_update_admin_only
  ON products FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can delete products
CREATE POLICY products_delete_admin_only
  ON products FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Product categories table policies
-- Everyone can read categories (public storefront)
CREATE POLICY product_categories_select_public
  ON product_categories FOR SELECT
  USING (true);

-- Only admins can insert categories
CREATE POLICY product_categories_insert_admin_only
  ON product_categories FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update categories
CREATE POLICY product_categories_update_admin_only
  ON product_categories FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can delete categories
CREATE POLICY product_categories_delete_admin_only
  ON product_categories FOR DELETE
  USING (public.is_admin(auth.uid()));

-- IMPORTANT: After running these policies, test that:
-- 1. Unauthenticated users can still view products on the storefront
-- 2. Regular users cannot create/edit/delete products
-- 3. Only admin users can access admin functions
