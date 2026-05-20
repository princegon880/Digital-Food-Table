-- SUPABASE SQL DATABASE SCHEMA FOR QR MENU SAAS
-- Copy and paste this script into your Supabase SQL Editor and click "Run".

-- 1. PROFILES (Restaurant Owner Settings)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  currency TEXT DEFAULT '₹',
  cover_image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow public read access to profiles" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Allow owners to update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Allow owners to insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);


-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🍽️',
  "order" INTEGER DEFAULT 0
);

-- Enable RLS for Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Allow public read access to categories" 
  ON public.categories FOR SELECT 
  USING (true);

CREATE POLICY "Allow owners to manage categories" 
  ON public.categories FOR ALL 
  USING (auth.uid() = restaurant_id)
  WITH CHECK (auth.uid() = restaurant_id);


-- 3. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_veg BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE
);

-- Enable RLS for Menu Items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Menu Items Policies
CREATE POLICY "Allow public read access to menu items" 
  ON public.menu_items FOR SELECT 
  USING (true);

CREATE POLICY "Allow owners to manage menu items" 
  ON public.menu_items FOR ALL 
  USING (auth.uid() = restaurant_id)
  WITH CHECK (auth.uid() = restaurant_id);


-- 4. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_number TEXT NOT NULL,
  items JSONB NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Preparing', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders Policies
CREATE POLICY "Allow public to insert orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public to read orders for order status checks" 
  ON public.orders FOR SELECT 
  USING (true);

CREATE POLICY "Allow owners to manage/read orders" 
  ON public.orders FOR ALL 
  USING (auth.uid() = restaurant_id)
  WITH CHECK (auth.uid() = restaurant_id);
