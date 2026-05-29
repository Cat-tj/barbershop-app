import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const phone = searchParams.get('phone')

    if (!phone?.trim()) {
      return Response.json({ found: false, error: 'Phone parameter is required.' }, { status: 400 })
    }

    // Join members with member_tiers
    const { data, error } = await supabase
      .from('members')
      .select(`
        id,
        name,
        phone,
        tier_id,
        total_points,
        total_spent,
        visit_count,
        member_tiers!inner (
          name,
          discount_pct,
          point_mult,
          color
        )
      `)
      .eq('phone', phone.trim())
      .maybeSingle()

    if (error) {
      console.error('Member fetch error:', error)
      return Response.json({ found: false, error: 'Failed to fetch member.' }, { status: 500 })
    }

    if (!data) {
      return Response.json({ found: false })
    }

    // Flatten the result
    const tier = data.member_tiers as unknown as {
      name: string
      discount_pct: number
      point_mult: number
      color: string
    }

    return Response.json({
      found: true,
      id: data.id,
      name: data.name,
      phone: data.phone,
      tier_id: data.tier_id,
      total_points: data.total_points,
      total_spent: data.total_spent,
      visit_count: data.visit_count,
      tier_name: tier.name,
      discount_pct: tier.discount_pct,
      point_mult: tier.point_mult,
      color: tier.color,
    })
  } catch (err) {
    console.error('Member API error:', err)
    return Response.json({ found: false, error: 'Internal server error.' }, { status: 500 })
  }
}
