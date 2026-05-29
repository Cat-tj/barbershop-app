# ROMEBOIS Phase 2 — Mobile-First Complete Barbershop App

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transformasi dari POS web app jadi aplikasi barbershop mobile-first yang proper — dengan purchase reports, inventory alerts, dashboard analytics, booking schedule, PWA installable, dan auth 3-role.

**Architecture:** Next.js App Router + Tailwind (dark zinc+amber) + Supabase PostgreSQL. Mobile-first: bottom tab navigation (5 icon), bottom sheet patterns, touch targets 44px+, text compact (text-xs/sm dominant). PWA: manifest.json + service worker + install prompt.

**Design principles:**
- **Mobile-first** — bottom tab nav (POS | Booking | Calendar | Purchases | Dashboard), bukan sidebar
- **Compact text** — `text-xs` (12px) buat label/keterangan, `text-sm` (14px) buat content, `text-base` (16px) cuma buat judul halaman
- **Touch optimized** — min 44px tap target, bottom sheet buat cart & form detail
- **3 role** — Admin (full), User/Kasir (POS + purchases + booking view), Guest (booking form)
- **PWA** — install ke homescreen, splash screen, offline-ready via service worker cache

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Supabase (PostgreSQL), bcryptjs, jose, next-pwa

**Current State:** 
- POS Dashboard di `/` (desktop 3-kolom layout)
- Booking page di `/booking` (basic form)
- Member lookup di `/members`
- 4 API routes: order, booking, member, redeem
- 14 tabel database + triggers
- Deployed di Vercel

---

## Phase 2A — Database: New Tables & Migrations

### Task 1: Create `user_accounts` table + seed admin

**Objective:** Tambah table untuk auth system + seed 1 admin account.

**SQL:**
```sql
-- User accounts table
CREATE TABLE IF NOT EXISTS user_accounts (
  id        SERIAL PRIMARY KEY,
  username  TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  active    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed admin account: admin / admin123
-- bcrypt hash of 'admin123': $2a$10$... (generate with bcryptjs)
INSERT INTO user_accounts (username, password_hash, role) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Seed POS user
INSERT INTO user_accounts (username, password_hash, role) 
VALUES ('kasir', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user')
ON CONFLICT (username) DO NOTHING;
```

**Verification:**
```sql
SELECT * FROM user_accounts;
-- Expected: 2 rows (admin, kasir)
```

---

### Task 2: Create `purchases` table

**Objective:** Table untuk menyimpan laporan pembelian barang.

**SQL:**
```sql
CREATE TABLE IF NOT EXISTS purchases (
  id            SERIAL PRIMARY KEY,
  item_name     TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('product', 'consumable')),
  quantity      INT NOT NULL CHECK (quantity > 0),
  unit_price    DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price   DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
  place_of_purchase TEXT NOT NULL DEFAULT '',
  is_new_item   BOOLEAN NOT NULL DEFAULT false,
  created_product_id INT REFERENCES products(id) ON DELETE SET NULL,
  purchased_by  INT REFERENCES user_accounts(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for reporting
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_category ON purchases(category);
```

**Verification:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'purchases';
-- Expected: purchases
```

---

### Task 3: Alter `bookings` table — add booking_type + notes

**Objective:** Tambah field untuk guest preference "dipanggil" vs "potong di tempat".

**SQL:**
```sql
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'potong_di_tempat' 
CHECK (booking_type IN ('potong_di_tempat', 'dipanggil'));

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;
```

**Verification:**
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name IN ('booking_type', 'notes');
-- Expected: 2 rows
```

---

## Phase 2B — Auth System

### Task 4: Create `lib/auth.ts` — Auth utilities

**Objective:** JWT-based auth helpers: login, verify, getSession.

**File:** Create `lib/auth.ts`

**Implementation:**
```typescript
import { SignJWT, jwtVerify } from 'jose'
import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'romebois-secret-key-change-in-production'
)

export interface UserSession {
  id: number
  username: string
  role: 'admin' | 'user'
}

export async function login(username: string, password: string): Promise<{ token: string; user: UserSession } | null> {
  const { data: account } = await supabase
    .from('user_accounts')
    .select('id, username, password_hash, role, active')
    .eq('username', username)
    .single()

  if (!account || !account.active) return null

  const valid = await bcrypt.compare(password, account.password_hash)
  if (!valid) return null

  const user: UserSession = { id: account.id, username: account.username, role: account.role as 'admin' | 'user' }

  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(JWT_SECRET)

  return { token, user }
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as UserSession
  } catch {
    return null
  }
}
```

**Dependencies to install:**
```bash
npm install bcryptjs jose
npm install -D @types/bcryptjs
```

**Verification:** Build passes (`npm run build`), no TypeScript errors.

---

### Task 5: Create `middleware.ts` — Route protection

**Objective:** Protect admin routes, allow guest access to booking.

**File:** Create `middleware.ts` (root of project)

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Routes that require admin role
const ADMIN_ROUTES = ['/admin', '/store']
// Routes that require at least user role
const USER_ROUTES = ['/purchases']
// Routes open to guests
const PUBLIC_ROUTES = ['/booking', '/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    // If user is already logged in and visiting /login, redirect to /
    if (pathname === '/login' && token) {
      const session = await verifyToken(token)
      if (session) return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Require auth for all other routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifyToken(token)
  if (!session) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }

  // Check admin routes
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

**Verification:** 
- `/booking` accessible without login
- `/admin` redirects to `/login` without session
- `/` redirects to `/login` without session

---

### Task 6: Create `/app/login/page.tsx` — Login page

**Objective:** Simple login form, set session cookie on success.

**File:** Create `app/login/page.tsx`

**Implementation:** Client component with:
- Username + password fields
- Login button → calls `/api/auth/login`
- On success: set cookie + redirect to `/`
- Error state: "Invalid credentials"
- Dark theme styled like existing pages
- No sidebar (clean layout)

**API:** `POST /api/auth/login` → returns `{ token, user }` + sets `session` cookie

**Verification:** 
- Login with admin/admin123 → redirects to `/`
- Login with kasir/admin123 → redirects to `/`
- Wrong password → shows error

---

### Task 7: Create `/app/api/auth/login/route.ts` + logout

**Objective:** Auth API: login + logout endpoints.

**Files:**
- Create `app/api/auth/login/route.ts`
- Create `app/api/auth/logout/route.ts`

**Login route:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()
  
  const result = await login(username, password)
  if (!result) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const response = NextResponse.json({ user: result.user })
  response.cookies.set('session', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60, // 12 hours
    path: '/',
  })

  return response
}
```

**Logout route:** Clear cookie, redirect to /login.

**Verification:** 
- `POST /api/auth/login` with valid creds → 200 + session cookie
- `POST /api/auth/logout` → cookie cleared

---

## Phase 2C — Store Management (`/store`)

### Task 8: Create `/app/store/page.tsx` — Store management dashboard

**Objective:** Admin page for CRUD products, services, capsters.

**File:** Create `app/store/page.tsx`

**Features:**
- **Tabs:** Products | Services | Capsters
- **Products tab:**
  - Table: name, price, stock, category, actions (edit, delete)
  - "Add Product" button → modal/inline form
  - Edit: inline or modal with name, price, stock, category
  - Delete with confirmation
- **Services tab:**
  - Table: name, price, duration, actions
  - Add/Edit/Delete like products
- **Capsters tab:**
  - Table: name, phone, active status
  - Toggle active/inactive
  - Add new capster
- All operations via Supabase REST client (not separate API routes — client-side)

**API:** Use `supabase.from('products').upsert(...)` directly from client component.

**Verification:**
- Add new product → appears in POS product list
- Edit product price → POS shows updated price
- Delete product → removed from POS
- Add service → appears in booking service list
- Toggle capster inactive → hidden from booking

---

### Task 9: Add `NEXT_PUBLIC_STORE_ACCESS` flag to `layout.tsx`

**Objective:** Show/hide Store nav link based on user role.

**File:** Modify `app/layout.tsx`

**Changes:**
- Read session from cookie in layout (server component)
- Pass user role to sidebar
- Add "Store" nav item (visible only for admin)
- Add "Purchases" nav item (visible for user + admin)

**Verification:** 
- Admin logs in → sees Store + Purchases in sidebar
- User (kasir) logs in → sees Purchases, no Store
- Guest → sees only Booking

---

## Phase 2D — Purchase Reports (`/purchases`)

### Task 10: Create `/app/purchases/page.tsx` — Purchase report form

**Objective:** Dynamic multi-item purchase reporting form.

**File:** Create `app/purchases/page.tsx`

**Features:**
- **Header:** "Lapor Pembelian" + current timestamp
- **Dynamic item rows:**
  - Each row has: Nama Barang (text with autocomplete from existing products), Kategori (product/consumable dropdown), Jumlah (number), Harga Satuan (number), Tempat Beli (text)
  - "Tambah Barang" button → adds new row
  - "Hapus" button per row
  - Total otomatis: jumlah × harga satuan per row, grand total di bawah
- **Smart product detection:**
  - Saat user mengetik nama barang, search existing products
  - Jika match: auto-fill category + show "barang sudah ada" indicator
  - Jika no match: user fills category manually, checkbox "Tambahkan sebagai produk baru"
- **Submit button:** "Simpan Pembelian"
  - Calls `/api/purchases` POST
  - Kirim semua items + flag `is_new_item` + `create_product` untuk item baru
- **Success:** show toast + reset form (tapi keep "Tempat Beli" untuk efisiensi)

**API:** `POST /api/purchases` — accepts array of purchase items

**Verification:**
- Add 3 items (1 existing, 2 new) → all saved in `purchases` table
- New items auto-created in `products` table
- Total calculated correctly
- Timestamp auto-recorded

---

### Task 11: Create `/app/api/purchases/route.ts` — Purchase API

**Objective:** Handle purchase report submission, auto-create new products.

**File:** Create `app/api/purchases/route.ts`

**Logic:**
```typescript
// For each item in request:
// 1. If is_new_item && create_product: INSERT into products (name, price, stock=quantity, category)
// 2. INSERT into purchases (item_name, category, quantity, unit_price, total_price, 
//    place_of_purchase, is_new_item, created_product_id, purchased_by, created_at)
// 3. Return summary: items saved, new products created
```

**Verification:**
- Send 1 existing item (pomade, 5 pcs) + 1 new item (hairspray, 10 pcs) → 
  - products table: hairspray added with stock 10
  - purchases table: 2 rows, pomade has created_product_id = existing id, hairspray has is_new_item=true

---

### Task 12: Add purchase history view to `/purchases`

**Objective:** Show recent purchases below the form.

**File:** Modify `app/purchases/page.tsx`

**Features:**
- Table below the form: "Riwayat Pembelian Terbaru"
- Columns: Tanggal, Nama Barang, Kategori, Jumlah, Harga, Total, Tempat Beli, Status (Baru/Lama)
- Paginated: last 50 purchases
- Search/filter by date range or item name

**Verification:** After submitting purchase, it appears in the history table immediately.

---

## Phase 2E — Admin Panel (`/admin`)

### Task 13: Create `/app/admin/page.tsx` — Admin dashboard

**Objective:** Admin panel with user management + member overview.

**File:** Create `app/admin/page.tsx`

**Features:**
- **Tabs:** Users | Members
- **Users tab:**
  - Table: username, role, active status, created_at
  - Add user button → modal: username, password, role
  - Edit: change role, toggle active
  - Delete user (with confirmation, can't delete self)
- **Members tab:**
  - Table: name, phone, tier, points, spent, visits
  - Search by name/phone
  - Click member → expand to show redemption history, visit history
  - Edit member: name, phone (tier auto-calculated by trigger)

**API:**
- `GET /api/admin/users` — list all users
- `POST /api/admin/users` — create user
- `PATCH /api/admin/users/[id]` — update user
- `DELETE /api/admin/users/[id]` — delete user

**Verification:**
- Admin can create new kasir account
- Admin can deactivate user
- Member list shows all members with tier info

---

### Task 14: Create admin API routes (users CRUD)

**Objective:** Admin-only API for user management.

**Files:**
- Create `app/api/admin/users/route.ts` (GET list + POST create)
- Create `app/api/admin/users/[id]/route.ts` (PATCH update + DELETE)

**Security:** Verify session token has admin role before processing.

**Verification:** 
- GET returns all users (without password_hash)
- POST with duplicate username → 409
- DELETE self → 400 "Cannot delete yourself"

---

## Phase 2F — Redesign Booking: Phone-First Member Registration Flow

> **Key behavior:**
> 1. Guest buka `/booking` → langsung input nomor HP
> 2. System auto-detect: nomor HP udah terdaftar sebagai member? 
>    - **Sudah member:** Tampilkan nama (read-only), langsung bisa pilih tanggal + jam + capster + layanan
>    - **Baru:** Minta isi nama + nomor HP → pilih jadwal → submit → auto-register jadi member
> 3. Time slot matrix: query `bookings` table real-time
>    - **Abu-abu (disabled):** Slot sudah di-booking orang lain
>    - **Hijau:** Slot sudah di-booking oleh nomor HP yang sama (booking sendiri)
>    - **Default (available):** Slot kosong, bisa dipilih
> 4. Member yang udah terdaftar: next time tinggal input nomor HP → langsung pilih jadwal

### Task 15: Create `/app/api/bookings/slots/route.ts` — Time slot availability API

**Objective:** API untuk query ketersediaan slot berdasarkan tanggal + capster.

**File:** Create `app/api/bookings/slots/route.ts`

**Logic:**
```typescript
// GET /api/bookings/slots?date=2026-05-30&capster_id=2&phone=08123456789
// Returns: 
// {
//   slots: [
//     { time: "09:00", status: "available" },
//     { time: "09:30", status: "taken" },          // booked by someone else
//     { time: "10:00", status: "mine" },            // booked by this phone
//     ...
//   ]
// }
```

**Query:**
```sql
SELECT start_time, customer_phone 
FROM bookings 
WHERE booking_date = $date 
  AND capster_id = $capster_id 
  AND status != 'cancelled'
```

**Verification:**
- `GET /api/bookings/slots?date=2026-05-30&capster_id=1&phone=08123456789` returns all slots with status
- Slot yang di-booking nomor lain → status "taken"
- Slot yang di-booking nomor sendiri → status "mine"

---

### Task 16: Redesign `/app/booking/page.tsx` — Phone-first flow

**Objective:** Full rewrite booking page dengan 3-step flow.

**File:** Rewrite `app/booking/page.tsx`

**Design — 3 section:**

```
┌─────────────────────────────────────────┐
│  📅 Booking                              │
├─────────────────────────────────────────┤
│                                          │
│  STEP 1: Masukkan Nomor HP               │
│  ┌─────────────────────────────────────┐ │
│  │  08xxxxxxxxxx          [Cek]        │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ── Jika BARU (no member found) ──      │
│  ┌─────────────────────────────────────┐ │
│  │  Nama: [________________]           │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ── Jika MEMBER (auto-detected) ──      │
│  👑 Andi Pratama · Silver · 1,250 pts   │
│                                          │
│  STEP 2: Pilih Capster                   │
│  [Dimas] [Rian] [Bayu] [Adit]           │
│                                          │
│  STEP 3: Pilih Tanggal                   │
│  [◀] 30 Mei 2026 [▶]                    │
│                                          │
│  STEP 4: Pilih Jam                       │
│  ┌──────┬──────┬──────┬──────┐          │
│  │09:00 │09:30 │10:00 │10:30 │          │
│  │ abu  │ hijau│ avail│ abu  │          │
│  ├──────┼──────┼──────┼──────┤          │
│  │11:00 │11:30 │12:00 │12:30 │          │
│  └──────┴──────┴──────┴──────┘          │
│                                          │
│  STEP 5: Pilih Layanan                   │
│  ☑ Haircut Classic · 50K · 30min        │
│  ☐ Haircut VIP · 75K · 45min            │
│  ☑ Beard Trim · 35K · 20min             │
│  Total: 85K · ±50min                    │
│                                          │
│  STEP 6: Preferensi                      │
│  ○ Potong di Tempat  ○ Dipanggil         │
│  Catatan: [________________]             │
│                                          │
│  [💈 Book Now]                           │
└─────────────────────────────────────────┘
```

**State management:**
```typescript
const [phone, setPhone] = useState('')
const [member, setMember] = useState<Member | null>(null)  // null = not checked, undefined = not found
const [isNewMember, setIsNewMember] = useState(false)
const [name, setName] = useState('')
const [selectedCapster, setSelectedCapster] = useState<number | null>(null)
const [date, setDate] = useState(today)
const [slots, setSlots] = useState<Slot[]>([])
const [selectedTime, setSelectedTime] = useState<string | null>(null)
const [selectedServices, setSelectedServices] = useState<number[]>([])
const [bookingType, setBookingType] = useState<'potong_di_tempat' | 'dipanggil'>('potong_di_tempat')
const [notes, setNotes] = useState('')
```

**Flow:**
1. User input nomor HP → debounce 500ms → call `GET /api/member?phone=...`
   - Found: `setMember(data)`, `setIsNewMember(false)`, name auto-filled readonly
   - Not found: `setMember(null)`, `setIsNewMember(true)`, show name input
2. Pilih capster → trigger slot reload
3. Pilih tanggal → trigger slot reload  
4. Slot grid: query setiap kali capster atau tanggal berubah
5. Pilih slot → highlighted
6. Pilih services → total auto-calculate
7. Submit → POST /api/booking (sama seperti sebelumnya, + booking_type + notes)
   - Kalau `isNewMember=true`: backend auto-create member via trigger/RPC

**Slot color logic:**
```typescript
function getSlotClass(slot: Slot, currentPhone: string) {
  if (slot.status === 'mine') return 'bg-green-600 border-green-500 text-white'        // my booking
  if (slot.status === 'taken') return 'bg-zinc-800 text-zinc-600 cursor-not-allowed'   // someone else
  if (slot.time === selectedTime) return 'bg-emerald-600 border-emerald-500 text-white' // selected
  return 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300'          // available
}
```

**Verification:**
- Input nomor HP member existing → name auto-appears, no name field
- Input nomor HP baru → name field appears
- Pilih capster + tanggal → slot grid populates
- Slot yang udah di-booking orang lain → abu-abu, gak bisa diklik
- Booking sendiri → hijau, bisa diklik (reschedule)
- Submit dengan isNewMember=true → member auto-created di database

---

### Task 17: Update `/app/api/booking/route.ts` — Handle new member registration

**Objective:** Booking API auto-registers new members on first booking.

**File:** Modify `app/api/booking/route.ts`

**Changes:**
```typescript
// After receiving booking request:
// 1. Check if is_new_member flag is true
// 2. If yes: INSERT into members (name, phone, tier_id=1) via RPC or direct insert
// 3. Then proceed with booking insert as usual
// 4. Accept booking_type + notes fields
```

**Verification:**
- Booking with `is_new_member: true` → member created + booking saved
- Booking with existing phone → no duplicate member, just booking

---

## Phase 2G — Integration & Polish

### Task 17: Update `layout.tsx` — Dynamic sidebar based on auth

**Objective:** Show correct nav items per role.

**File:** Modify `app/layout.tsx`

**Changes:**
- Make layout a server component that reads session cookie
- If logged in:
  - Admin: POS, Booking, Purchases, Store, Members, Admin
  - User: POS, Purchases, Booking, Members
- If not logged in: Booking only
- Add logout button in sidebar footer

**Note:** `layout.tsx` currently uses `"use client"` implicitly via client-side interactivity. May need to split into server layout + client sidebar.

---

### Task 18: Add JWT_SECRET to Vercel env vars

**Objective:** Production JWT secret for token signing.

**Command:**
```bash
cd barbershop-app
npx vercel env add JWT_SECRET production
# Value: random 32-char string
```

**Also add:** Generate proper bcrypt hash for admin password (instead of using placeholder).

---

### Task 19: Install dependencies & build

**Objective:** Install new packages, verify build passes.

**Commands:**
```bash
npm install bcryptjs jose
npm install -D @types/bcryptjs
npm run build
```

**Verification:** Build succeeds, all routes generated.

---

### Task 20: Deploy to Vercel

**Objective:** Push code and deploy.

**Commands:**
```bash
git add -A
git commit -m "feat: Phase 2 - purchases, admin, store management, auth"
git push origin master
cd barbershop-app && npx vercel --prod
```

**Verification:** 
- All pages accessible on production URL
- Auth works on Vercel
- Database changes applied to Supabase

---

## Phase 2H — Mobile-First UI Restructure

### Task 19: Rewrite `app/layout.tsx` → Bottom Tab Navigation

**Objective:** Ganti sidebar desktop jadi bottom tab bar ala mobile app.

**File:** Rewrite `app/layout.tsx`

**Design:**
```
┌─────────────────────────┐
│  ROMEBOIS        [👤]   │ ← compact top bar (h-12)
├─────────────────────────┤
│                         │
│  [page content]         │ ← flex-1, overflow-y-auto
│                         │
├─────────────────────────┤
│  💈   📅   📦   🛒   📊 │ ← bottom tab (h-14, 5 icon)
│  POS  Book Calen Purch Dash│ ← text-[10px] label
└─────────────────────────┘
```

**Tab mapping:**
| Tab | Icon | Path | Role |
|-----|------|------|------|
| POS | 💈 | `/` | admin, user |
| Booking | 📅 | `/booking` | all (guest allowed) |
| Calendar | 📆 | `/calendar` | admin |
| Purchases | 📦 | `/purchases` | admin, user |
| Dashboard | 📊 | `/dashboard` | admin |

**Implementation:**
- Top bar: logo "R" kecil + "ROMEBOIS" text-xs, user avatar di kanan
- Bottom tab: fixed bottom, `h-14`, glass effect (`bg-zinc-900/90 backdrop-blur`)
- Active tab: amber color, inactive: zinc-500
- Gunakan `usePathname()` untuk deteksi tab aktif
- `layout.tsx` tetap server component untuk metadata, client component `BottomNav` terpisah

**Admin-only tabs:** Calendar + Dashboard hanya muncul kalau session role = admin.

**Text sizing:**
- Tab label: `text-[10px]` 
- Top bar title: `text-xs font-bold tracking-widest`
- Page titles: `text-base font-bold` (maksimal!)
- Content: `text-sm`
- Labels: `text-xs`

---

### Task 20: Rewrite `/app/page.tsx` → Mobile POS

**Objective:** Ubah POS 3-kolom desktop jadi layout mobile dengan bottom sheet cart.

**File:** Rewrite `app/page.tsx`

**Mobile POS layout:**
```
┌─────────────────────────┐
│  [Products | Services]  │ ← tab switcher (sticky top)
│  [Search...          ]  │ ← compact search
├─────────────────────────┤
│                         │
│  [product cards grid]   │ ← 2-column grid, compact
│  ┌──────┐ ┌──────┐     │
│  │Pomade│ │Wax   │     │
│  │35K   │ │55K   │     │
│  └──────┘ └──────┘     │
│                         │
├─────────────────────────┤
│  🛒 3 items · Rp 150K  │ ← cart summary bar (sticky bottom)
│  [💳 Checkout]          │ ← tap to open bottom sheet
└─────────────────────────┘
```

**Bottom sheet (slide up saat checkout):**
- Customer name + phone
- Cart items list (compact, swipe to delete)
- Capster selector dropdown
- Payment method: Cash/QRIS/Debit buttons
- Discount input
- Total besar + "Process Order" button
- Backdrop gelap

**Design rules:**
- Product card: `px-3 py-2.5`, name `text-xs`, price `text-sm font-semibold text-amber-400`
- Search bar: `h-9`, `text-xs`
- Cart bar: `h-12`, `text-sm`
- Tap targets min 44px
- No horizontal scroll — semua vertical

---

### Task 21: Install `next-pwa` + configure PWA

**Objective:** Aktifin PWA biar bisa install ke homescreen.

**Command:**
```bash
npm install next-pwa
```

**File:** Modify `next.config.ts`

```typescript
import withPWA from 'next-pwa'

const nextConfig = {
  // ... existing config
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
```

**File:** Create `public/manifest.json`
```json
{
  "name": "ROMEBOIS Barbershop",
  "short_name": "ROMEBOIS",
  "description": "Professional Barbershop POS & Booking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#f59e0b",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**File:** Create `public/icon-192.png` & `public/icon-512.png` — R logo sederhana (amber background + "R" text)

**Verification:**
- `npm run build` produces service worker in `.next`
- Chrome mobile: "Add to Home Screen" prompt appears
- App opens standalone (no address bar)

---

## Phase 2I — Dashboard Analytics

### Task 22: Create `/app/api/dashboard/route.ts` — Dashboard data API

**Objective:** Single API endpoint yang return semua data dashboard.

**File:** Create `app/api/dashboard/route.ts`

**Returns:**
```json
{
  "today": {
    "revenue": 2850000,
    "orders": 12,
    "bookings": 8
  },
  "top_services": [
    { "name": "Haircut Classic", "count": 8, "revenue": 400000 },
    { "name": "Beard Trim", "count": 5, "revenue": 175000 }
  ],
  "top_capsters": [
    { "name": "Dimas", "orders": 6, "commission": 108000 }
  ],
  "low_stock": [
    { "name": "Pomade Light", "stock": 2, "threshold": 5 }
  ],
  "recent_orders": [
    { "customer_name": "Andi", "total": 85000, "time": "14:30", "capster": "Dimas" }
  ]
}
```

**SQL:** Aggregation queries on orders, order_items, products, commissions.

---

### Task 23: Create `/app/dashboard/page.tsx` — Dashboard UI

**Objective:** Mobile dashboard dengan KPI cards + charts.

**File:** Create `app/dashboard/page.tsx`

**Layout (mobile):**
```
┌─────────────────────────┐
│  Dashboard              │ ← text-base
│  Jumat, 30 Mei           │ ← text-xs text-zinc-500
├─────────────────────────┤
│  ┌──────┐┌──────┐┌─────┐│
│  │💵2.85││📋 12 ││📅 8 ││ ← KPI cards (3 kolom)
│  │  Jt  ││Order ││Book  ││   text-xs label, text-sm value
│  └──────┘└──────┘└─────┘│
│                         │
│  Top Services            │ ← section title text-xs uppercase
│  Haircut Classic  8x 400K│ ← compact row: name | count | amount
│  Beard Trim       5x 175K│   text-xs
│                         │
│  Top Capsters            │
│  Dimas      6 order  108K│
│                         │
│  ⚠ Stok Menipis          │ ← amber/red accent
│  Pomade Light     stok 2 │
│  Shampoo          stok 1 │
│                         │
│  Transaksi Terakhir       │
│  Andi · 85K · Dimas ·14:3│
└─────────────────────────┘
```

**Auto-refresh:** Polling `GET /api/dashboard` setiap 30 detik.

---

## Phase 2J — Schedule Calendar

### Task 24: Create `/app/calendar/page.tsx` — Weekly schedule view

**Objective:** Admin bisa liat semua booking dalam tampilan mingguan.

**File:** Create `app/calendar/page.tsx`

**Layout (scroll horizontal):**
```
┌──────────────────────────────────────┐
│  ◀ 30 Mei - 5 Jun 2026 ▶  [Today]  │
├──────────┬──────┬──────┬──────┬─────┤
│          │ Dimas│ Rian │ Bayu │Adit │ ← capster names (text-xs)
├──────────┼──────┼──────┼──────┼─────┤
│ 09:00    │ Andi │      │      │     │ ← booking cell (text-[10px])
│ 09:30    │      │ Budi │      │     │   green bg = occupied
│ 10:00    │      │      │ Cici │     │
│ 10:30    │ Dedi │      │      │     │
│ ...      │      │      │      │     │
└──────────┴──────┴──────┴──────┴─────┘
```

**Features:**
- Horizontal scroll (swipe kiri/kanan ganti minggu)
- Tap cell → detail popup: nama, service, jam, booking type
- Sticky kiri: jam, sticky atas: nama capster
- Cell warna: hijau = ada booking, transparan = kosong

---

## Phase 2K — Inventory Alerts

### Task 25: Add stock threshold to `products` table + alert badge

**Objective:** Auto-detect low stock & show badge.

**SQL:**
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_threshold INT DEFAULT 5;
```

**File:** Modify `app/dashboard/page.tsx` — tambah section "⚠ Stok Menipis"
**File:** Modify `app/layout.tsx` — badge di tab Purchases kalau ada stok rendah

**Logic:** Query `SELECT name, stock FROM products WHERE stock <= stock_threshold`

---

## Phase 2L — Digital Receipt

### Task 26: Create receipt view after order

**Objective:** Setelah order sukses, tampilkan receipt yang bisa di-screenshot.

**File:** Modify `app/page.tsx` — after successful order, show receipt modal

**Receipt layout:**
```
┌─────────────────────┐
│      ROMEBOIS       │
│  Jl. Barbershop 123 │
│  Tel: 08xxxxxxxx    │
├─────────────────────┤
│  Order #0042        │
│  30 Mei 2026 14:30  │
├─────────────────────┤
│  Haircut   1x  50K  │
│  Beard Trim 1x  35K │
│  Pomade     2x  70K │
├─────────────────────┤
│  Subtotal    155K   │
│  Discount     10K   │
│  Total       145K   │
├─────────────────────┤
│  Capster: Dimas     │
│  Payment: Cash      │
│  Member: Andi (800) │
├─────────────────────┤
│  Terima kasih!      │
└─────────────────────┘
      [📤 Share] [✕ Close]
```

**"Share" button** — trigger native share API atau copy to clipboard.

---

## Phase 2M — Customer History & Notes

### Task 27: Add `customer_notes` to members + history view

**Objective:** Setiap member punya notes + riwayat kunjungan terlihat.

**SQL:**
```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;
```

**File:** Create `app/members/[id]/page.tsx` — detail member page

**Features:**
- Riwayat booking: list 10 booking terakhir
- Riwayat transaksi: list 10 order terakhir (service + product)
- Favorite capster (auto-calculated dari order history)
- Notes field (editable oleh admin/kasir)
- Tier progress bar: "Rp 2.5jt / 3jt menuju Silver"

**Verification:** Cari member → tap → lihat full history

---

## Phase 2N — Daily Closing Report

### Task 28: Create `/app/api/closing/route.ts` + UI

**Objective:** Fitur tutup hari — summary + export.

**File:** Create `app/api/closing/route.ts`

**API:** `POST /api/closing` — generate today's summary
```json
{
  "date": "2026-05-30",
  "total_revenue": 2850000,
  "cash": 1500000,
  "qris": 1000000,
  "debit": 350000,
  "total_orders": 12,
  "total_services": 18,
  "total_products_sold": 15,
  "purchases_today": 500000,
  "net_income": 2350000
}
```

**UI:** Tombol "Tutup Hari" di dashboard → konfirmasi → tampilkan summary → opsional "Export PDF" (print-friendly HTML).

---

## Phase 2O — Waiting Queue + Price Catalog

### Task 29: Create `/app/catalog/page.tsx` — Public price list

**Objective:** Halaman harga yang bisa dishare ke calon customer.

**File:** Create `app/catalog/page.tsx`

**Features:**
- Public (no auth needed)
- List services: nama, harga, durasi
- List products: nama, harga
- Share-friendly: meta tags buat WhatsApp/IG preview
- Font lebih kecil untuk compactness

---

### Task 30: Create `/app/queue/page.tsx` — Waiting queue display

**Objective:** Tampilan antrian untuk walk-in customer.

**File:** Create `app/queue/page.tsx`

**Features:**
- Admin/kasir add walk-in ke queue di POS
- Queue display: "Sekarang: Andi (Dimas) — Berikutnya: Budi, Cici"
- Layout besar cocok buat di-cast ke TV/monitor
- Tap selesai → hilang dari queue

---

## Phase 2P — Dependencies, Build & Deploy

### Task 31: Install all dependencies

```bash
npm install bcryptjs jose next-pwa
npm install -D @types/bcryptjs
```

### Task 32: Build & fix any errors

```bash
npm run build
```

### Task 33: Deploy to Vercel

```bash
git add -A
git commit -m "feat: Phase 2 complete - mobile-first ROMEBOIS"
git push origin master
npx vercel --prod
```

### Task 34: Generate PWA icons

Buat `icon-192.png` dan `icon-512.png` — simple logo "R" di background amber. Bisa pakai canvas HTML atau screenshot.

---

## Summary: Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| Database migrations (5 SQL blocks) | CREATE/ALTER | 2A |
| `lib/auth.ts` | CREATE | 2B |
| `middleware.ts` | CREATE | 2B |
| `app/login/page.tsx` | CREATE | 2B |
| `app/api/auth/login/route.ts` | CREATE | 2B |
| `app/api/auth/logout/route.ts` | CREATE | 2B |
| `app/store/page.tsx` | CREATE | 2C |
| `app/purchases/page.tsx` | CREATE | 2D |
| `app/api/purchases/route.ts` | CREATE | 2D |
| `app/admin/page.tsx` | CREATE | 2E |
| `app/api/admin/users/route.ts` | CREATE | 2E |
| `app/api/admin/users/[id]/route.ts` | CREATE | 2E |
| `app/api/bookings/slots/route.ts` | CREATE | 2F |
| `app/api/dashboard/route.ts` | CREATE | 2I |
| `app/api/closing/route.ts` | CREATE | 2N |
| `app/dashboard/page.tsx` | CREATE | 2I |
| `app/calendar/page.tsx` | CREATE | 2J |
| `app/catalog/page.tsx` | CREATE | 2O |
| `app/queue/page.tsx` | CREATE | 2O |
| `app/members/[id]/page.tsx` | CREATE | 2M |
| `public/manifest.json` | CREATE | 2H |
| `public/icon-192.png` | CREATE | 2H |
| `public/icon-512.png` | CREATE | 2H |
| `next.config.ts` | MODIFY | 2H |
| `app/layout.tsx` | **REWRITE** | 2H |
| `app/page.tsx` | **REWRITE** | 2H |
| `app/booking/page.tsx` | **REWRITE** | 2F |
| `app/api/booking/route.ts` | MODIFY | 2F |

**Total: ~28 files** (22 create, 2 modify, 4 rewrite)
**Dependencies:** `bcryptjs`, `jose`, `@types/bcryptjs`, `next-pwa`

---

## Notes & Open Questions

1. **Auth persistence:** Using httpOnly cookies → works on same domain. If mobile access needed, consider Bearer token in localStorage instead (less secure tapi lebih portable).

2. **Phone-first booking flow:** Guest gak perlu login — cukup nomor HP. Member auto-registered on first booking. Next time tinggal input nomor HP → system langsung kenali.

3. **Slot "mine" indicator (hijau):** Supaya member tau mereka udah booking di jam itu. Bisa diklik buat reschedule (update booking) atau cancel. Detail UX: klik slot hijau → muncul popup "Kamu sudah booking di jam ini. Batalkan?" 

4. **Slot reload:** Setiap ganti capster atau tanggal, auto-fetch slots. Pakai debounce 300ms biar gak spam API.

5. **Product autocomplete di purchase form:** Bisa pakai Supabase `.ilike()` query debounced 300ms.

6. **bcrypt hash generation:** Jangan hardcode hash — generate via script: `node -e "const bcrypt=require('bcryptjs');bcrypt.hash('admin123',10).then(h=>console.log(h))"`

7. **Vercel cold start:** Middleware runs on Edge runtime — pastikan `jose` works on Edge (it does, tapi `bcryptjs` harus stay di Node.js runtime untuk API routes).

8. **Double-booking prevention:** Slot API hanya mengembalikan status "taken"/"mine" — actual locking tetap di database via unique constraint atau trigger. Bisa juga pakai `FOR UPDATE` di PostgreSQL saat insert booking.
