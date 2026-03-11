export type UserRole = 'admin' | 'owner' | 'seller';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  store_id?: number | null;
}

export interface Store {
  id: number;
  owner_id: number;
  name: string;
  address: string;
  phone?: string;
  nif?: string;
  logo_url?: string;
  status: 'active' | 'inactive';
  license_status: 'active' | 'expired' | 'pending';
  license_expiry: string;
  staff_count?: number;
  today_sales?: number;
}

export interface Product {
  id: number;
  store_id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  is_promo: boolean;
  discount_percent?: number;
  promo_name?: string;
  barcode: string;
}

export interface Transaction {
  id: number;
  store_id: number;
  seller_id: number;
  total_amount: number;
  timestamp: string;
  items: string; // JSON string of items
}

export interface Staff {
  id: number;
  store_id: number;
  user_id: number;
  salary: number;
  shift_info: string;
}

export interface License {
  id: number;
  store_id: number;
  type: string;
  price: number;
  start_date: string;
  end_date: string;
}
