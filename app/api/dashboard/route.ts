import { NextRequest } from 'next/server'
import db from '@/lib/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const period = searchParams.get('period') || 'today' // today, week, month

    let dateFilter = "date('now')"
    if (period === 'week') dateFilter = "date('now', '-7 days')"
    if (period === 'month') dateFilter = "date('now', 'start of month')"

    // === RINGKASAN HARIAN ===
    const dailySummary = db.prepare(`
      SELECT
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COALESCE(AVG(o.total), 0) as avg_order
      FROM orders o
      WHERE o.created_at >= ${dateFilter}
    `).get() as any

    // === TOP CAPSTER ===
    const topCapsters = db.prepare(`
      SELECT c.name, c.id,
        COUNT(DISTINCT o.id) as orders_handled,
        COALESCE(SUM(oi.subtotal), 0) as revenue_generated
      FROM capsters c
      LEFT JOIN order_items oi ON oi.capster_id = c.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= ${dateFilter}
      WHERE c.active = 1
      GROUP BY c.id
      ORDER BY revenue_generated DESC
      LIMIT 5
    `).all() as any[]

    // === TOP SERVICES ===
    const topServices = db.prepare(`
      SELECT s.name, SUM(oi.qty) as qty_sold, SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.item_type = 'service' AND o.created_at >= ${dateFilter}
      GROUP BY s.id
      ORDER BY qty_sold DESC
      LIMIT 5
    `).all() as any[]

    // === TOP PRODUCTS ===
    const topProducts = db.prepare(`
      SELECT p.name, SUM(oi.qty) as qty_sold, SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.item_type = 'product' AND o.created_at >= ${dateFilter}
      GROUP BY p.id
      ORDER BY qty_sold DESC
      LIMIT 5
    `).all() as any[]

    // === RECENT ORDERS ===
    const recentOrders = db.prepare(`
      SELECT o.id, o.customer_name, o.customer_phone, o.total, o.payment_method, o.created_at
      FROM orders o
      WHERE o.created_at >= ${dateFilter}
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all() as any[]

    // === CRM: MEMBERS OVERDUE (lewat 30 hari belum potong) ===
    const membersOverdue = db.prepare(`
      SELECT m.id, m.name, m.phone, m.last_visit_date, m.visit_count,
        julianday('now') - julianday(m.last_visit_date) as days_since_visit
      FROM members m
      WHERE m.last_visit_date IS NOT NULL
        AND julianday('now') - julianday(m.last_visit_date) > 30
      ORDER BY days_since_visit DESC
      LIMIT 10
    `).all() as any[]

    // === CRM: MEMBERS LIKELY TO COME BACK (20-30 hari sejak terakhir) ===
    const membersLikely = db.prepare(`
      SELECT m.id, m.name, m.phone, m.last_visit_date, m.visit_count,
        julianday('now') - julianday(m.last_visit_date) as days_since_visit
      FROM members m
      WHERE m.last_visit_date IS NOT NULL
        AND julianday('now') - julianday(m.last_visit_date) BETWEEN 20 AND 30
      ORDER BY days_since_visit DESC
      LIMIT 10
    `).all() as any[]

    // === CRM: MEMBERS BARU POTONG (hari ini) ===
    const membersRecentHaircut = db.prepare(`
      SELECT DISTINCT m.id, m.name, m.phone, o.created_at as last_visit_date
      FROM members m
      JOIN orders o ON o.customer_phone = m.phone
      WHERE date(o.created_at) = date('now')
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all() as any[]

    // === REVENUE TREND (7 hari terakhir) ===
    const revenueTrend = db.prepare(`
      SELECT date(o.created_at) as day,
        COUNT(o.id) as orders,
        COALESCE(SUM(o.total), 0) as revenue
      FROM orders o
      WHERE o.created_at >= date('now', '-7 days')
      GROUP BY date(o.created_at)
      ORDER BY day ASC
    `).all() as any[]

    // === PAYMENT BREAKDOWN ===
    const paymentBreakdown = db.prepare(`
      SELECT o.payment_method, COUNT(o.id) as count, COALESCE(SUM(o.total), 0) as total
      FROM orders o
      WHERE o.created_at >= ${dateFilter}
      GROUP BY o.payment_method
    `).all() as any[]

    // === LOW STOCK ALERTS ===
    const lowStock = db.prepare(`
      SELECT name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC
    `).all() as any[]

    // === TOTAL MEMBERS ===
    const totalMembers = (db.prepare('SELECT COUNT(*) as c FROM members').get() as any).c

    return Response.json({
      period,
      dailySummary,
      topCapsters,
      topServices,
      topProducts,
      recentOrders,
      membersOverdue,
      membersLikely,
      membersRecentHaircut,
      revenueTrend,
      paymentBreakdown,
      lowStock,
      totalMembers,
    })
  } catch (err) {
    console.error('Dashboard GET error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
