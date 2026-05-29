import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  products: { id: number; name: string; price: number; stock: number; category: 'product' | 'consumable' }
  services: { id: number; name: string; price: number; duration: number | null }
  capsters: { id: number; name: string; phone: string | null; active: boolean }
  orders: { id: number; customer_name: string; customer_phone: string | null; status: string; subtotal: number; discount: number; total: number; payment_method: string | null }
  order_items: { id: number; order_id: number; item_type: 'product' | 'service'; product_id: number | null; service_id: number | null; capster_id: number | null; qty: number; price: number; subtotal: number }
  members: { id: number; name: string; phone: string; tier_id: number; total_points: number; total_spent: number; visit_count: number }
  member_tiers: { id: number; name: string; min_spending: number; discount_pct: number; point_mult: number; color: string }
  rewards: { id: number; name: string; description: string | null; points_cost: number; reward_type: string; value: number | null }
  reward_redemptions: { id: number; member_id: number; reward_id: number; points_used: number; status: string }
}
