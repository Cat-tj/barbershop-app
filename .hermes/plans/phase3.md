# Phase 3 — Admin, Dashboard, POS, Responsive

## Goal
Fix semua pain points user: admin editing, dashboard analytics, POS cashier + phone lookup, responsive desktop, registration form.

## Issues Found
1. **Admin page cuma Users+Members** — Product/Service/Capster management ada di `/store` (More menu), user ga nemu. Fix: merge ke Admin page dengan tabs Products + Services + Capsters.
2. **POS capster selection** — Udah ada `selectedCapsterId` tapi UI-nya ga standout. Fix: lebih prominent di POS header.
3. **Desktop layout** — Mobile-first tapi overflow/narrow di desktop. Fix: max-width container, center content, grid layouts.
4. **Dashboard kosong** — Ga ada analytics. Fix: API dashboard yang return top products, top services, top cashiers, daily revenue, recent transactions.
5. **Phone lookup di POS** — Sekarang pake nama. Fix: auto-detect member by phone number, suggest name.
6. **Registration/subdomain** — Belum ada booking public form. Fix: public booking/registration page.

## Tasks

### Batch 1: Admin Page Enhancement
- [ ] Add Products tab ke admin (edit price, stock, category, stock_threshold inline)
- [ ] Add Services tab ke admin (edit price, duration inline)
- [ ] Add Capsters tab ke admin (edit name, phone, active toggle)
- [ ] Quick inline edit — click row → expand edit form (no modal)
- [ ] Stock threshold field di product edit

### Batch 2: Dashboard Analytics
- [ ] API `/api/dashboard` — return: total_revenue_today, total_orders_today, avg_order_value, top_products (by qty sold), top_services (by qty sold), top_capsters (by orders handled), revenue_last_7_days
- [ ] Dashboard UI: stats cards (revenue, orders, avg), charts/graphs for top items + revenue trend, top capster leaderboard
- [ ] Dashboard untuk admin role only

### Batch 3: POS Improvements
- [ ] Capster selector di POS header (prominent, always visible)
- [ ] Phone number auto-lookup — enter phone → auto-fill customer name dari members + tampilkan member info
- [ ] Quick capster assignment per service di cart

### Batch 4: Responsive Layout
- [ ] Desktop: max-w-screen-xl mx-auto + centered content
- [ ] POS: 2-column layout on desktop (products left, cart right)
- [ ] Tables: horizontal scroll on mobile, full width on desktop
- [ ] Bottom nav: tetap bottom tab di mobile, top/side di desktop?

### Batch 5: Registration Page
- [ ] Public page `/register` — booking form (name, phone, service, capster, date/time)
- [ ] API `/api/register` — create booking via public access
- [ ] Subdomain hint di Vercel (manual DNS setup)

## Execution Plan
Deploy via 3 batch subagents parallel:
- SA-1: Batch 1 + Batch 4 (Admin enhancement + responsive)
- SA-2: Batch 2 + Batch 3 (Dashboard + POS improvements)
- SA-3: Batch 5 (Registration page)

Then final build + deploy.
