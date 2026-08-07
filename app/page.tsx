"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import QrisModal from "./components/QrisModal";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: "product" | "consumable";
};

type Service = {
  id: number;
  name: string;
  price: number;
  duration: number | null;
};

type Capster = {
  id: number;
  name: string;
  phone: string | null;
  active: boolean;
};

type CartItem = {
  id: string;
  itemType: "product" | "service";
  productId?: number;
  serviceId?: number;
  name: string;
  price: number;
  qty: number;
  capsterId?: number;
  capsterName?: string;
};

type ReceiptData = {
  orderId: number;
  date: string;
  time: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  capsterName: string;
};

let cartIdCounter = 0;
function nextCartId() {
  return `cart-${++cartIdCounter}`;
}

import { formatRupiah as formatRp } from '@/lib/currency'

function getDateTimeStrings() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateStr, timeStr };
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [capsters, setCapsters] = useState<Capster[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedCapsterId, setSelectedCapsterId] = useState<number | null>(null);
  const [cartOpenMobile, setCartOpenMobile] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [qrisOpen, setQrisOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [sRes] = await Promise.all([
          fetch('/api/services').then(r => r.json()).catch(() => ({ services: [] }))
        ]);

        if (sRes.services && sRes.services.length > 0) {
          setServices(sRes.services);
        } else {
          setServices([
            { id: 1, name: 'Potong Cukur Gentleman', price: 50000, duration: 30 },
            { id: 2, name: 'Cukur + Keramas + Head Massage', price: 75000, duration: 45 },
            { id: 3, name: 'Coloring / Semir Hair Trend', price: 120000, duration: 60 }
          ]);
        }

        setProducts([
          { id: 1, name: "Pomade Waterbased Altora", price: 85000, stock: 15, category: "product" },
          { id: 2, name: "Hair Tonic Gingseng", price: 65000, stock: 8, category: "product" },
          { id: 3, name: "Shampoo Barbershop 1L", price: 110000, stock: 4, category: "consumable" }
        ]);

        setCapsters([
          { id: 1, name: "Budi Barbershop", phone: "081234567890", active: true },
          { id: 2, name: "Rian Hair Stylist", phone: "081298765432", active: true }
        ]);
      } catch (err) {
        console.error("Failed to load POS data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q) || String(s.price).includes(q));
  }, [services, search]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || String(p.price).includes(q));
  }, [products, search]);

  const addToCart = useCallback(
    (item: Product | Service, itemType: "product" | "service") => {
      setCart((prev) => {
        if (itemType === "service") {
          const newItem: CartItem = {
            id: nextCartId(),
            itemType: "service",
            serviceId: item.id,
            name: item.name,
            price: item.price,
            qty: 1,
            capsterId: selectedCapsterId ?? undefined,
            capsterName: selectedCapsterId
              ? capsters.find((c) => c.id === selectedCapsterId)?.name
              : undefined,
          };
          return [...prev, newItem];
        }
        const existing = prev.find(
          (ci) => ci.itemType === "product" && ci.productId === item.id
        );
        if (existing) {
          return prev.map((ci) =>
            ci.id === existing.id ? { ...ci, qty: ci.qty + 1 } : ci
          );
        }
        const newItem: CartItem = {
          id: nextCartId(),
          itemType: "product",
          productId: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
        };
        return [...prev, newItem];
      });
    },
    [selectedCapsterId, capsters]
  );

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.id !== id) return ci;
          const newQty = ci.qty + delta;
          return newQty < 1 ? null : { ...ci, qty: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.price * ci.qty, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);

  const processOrder = useCallback(async () => {
    if (cart.length === 0) {
      setAlert({ type: "error", message: "Keranjang kosong." });
      return;
    }
    if (!customerName.trim()) {
      setAlert({ type: "error", message: "Masukkan nama pelanggan." });
      return;
    }
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          subtotal,
          discount,
          total,
          payment_method: paymentMethod,
          items: cart.map((ci) => ({
            item_type: ci.itemType,
            product_id: ci.productId ?? null,
            service_id: ci.serviceId ?? null,
            capster_id: ci.capsterId ?? null,
            qty: ci.qty,
            price: ci.price,
          })),
        }),
      });

      if (!res.ok) throw new Error("Gagal memproses order");

      const data = await res.json();
      const { dateStr, timeStr } = getDateTimeStrings();

      setReceipt({
        orderId: data.order_id ?? Math.floor(1000 + Math.random() * 9000),
        date: dateStr,
        time: timeStr,
        items: cart.map((ci) => ({ name: ci.name, qty: ci.qty, price: ci.price })),
        subtotal,
        discount,
        total,
        paymentMethod,
        capsterName: capsters.find((c) => c.id === selectedCapsterId)?.name ?? "",
      });

      setAlert({ type: "success", message: "Transaksi berhasil diproses!" });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      setCartOpenMobile(false);
    } catch {
      setAlert({ type: "error", message: "Gagal memproses transaksi." });
    } finally {
      setSubmitting(false);
    }
  }, [cart, customerName, customerPhone, subtotal, discount, total, paymentMethod, capsters, selectedCapsterId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f7fc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-medium">Memuat POS Kasir Altora...</span>
        </div>
      </div>
    );
  }

  const renderCartInner = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Keranjang Kasir ({cart.length})</span>
        </h2>
        {cart.length > 0 && (
          <button onClick={() => setCart([])} className="text-xs text-red-400 hover:underline">
            Kosongkan
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-zinc-800/60">
        {cart.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Keranjang masih kosong.<br />Klik (+) pada Layanan/Produk untuk menambahkan.
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-800">{item.name}</div>
                <div className="text-[10px] text-slate-400">{formatRp(item.price)} x {item.qty}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold">&minus;</button>
                <span className="font-bold font-mono">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold">+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-200 space-y-3 bg-white/80">
        <input
          type="text"
          placeholder="No HP / WhatsApp (Auto-lookup Member)"
          value={customerPhone}
          onChange={async (e) => {
            const val = e.target.value;
            setCustomerPhone(val);
            if (val.length >= 8) {
              try {
                const res = await fetch(`/api/member/lookup?phone=${encodeURIComponent(val)}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.name) {
                    setCustomerName(data.name);
                  }
                }
              } catch (err) {
                // silent lookup
              }
            }
          }}
          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
        />
        <input
          type="text"
          placeholder="Nama Pelanggan"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
        />

        <div className="flex gap-2">
          {['cash', 'qris', 'debit'].map((m) => (
            <button
              key={m}
              onClick={() => setPaymentMethod(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${paymentMethod === m ? 'bg-purple-500 text-zinc-950 shadow-md' : 'bg-slate-100 text-slate-500'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-200">
          <span className="text-slate-500">Total Tagihan</span>
          <span className="text-purple-500 font-mono text-base">{formatRp(total)}</span>
        </div>

        <button
          onClick={() => {
            if (paymentMethod === 'qris') setQrisOpen(true)
            else processOrder()
          }}
          disabled={cart.length === 0 || submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-zinc-950 font-bold text-sm shadow-lg shadow-purple-500/10 active:scale-[0.98] disabled:opacity-50"
        >
          Bayar / Charge {formatRp(total)}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#f8f7fc] relative">
      {/* LEFT AREA: SERVICES & PRODUCTS ALL-IN-ONE SINGLE PAGE */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
        {/* Top Search Bar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Cari Layanan atau Produk Kasir..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500/60"
          />
        </div>

        {alert && (
          <div
            className="px-4 py-3 rounded-xl text-xs font-semibold flex justify-between items-center"
            style={alert.type === 'success'
              ? { background: '#e4f5ee', color: '#0e7a57', border: '1px solid rgba(14,122,87,.2)' }
              : { background: '#fdeaec', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }
            }
          >
            <span>{alert.message}</span>
            <button onClick={() => setAlert(null)} className="ml-2 font-bold">&times;</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* SECTION 1: LAYANAN / SERVICES (ATAS) */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-500 flex items-center gap-2">
              <span>✂️ LAYANAN CUKUR (SERVICES)</span>
              <span className="text-[10px] text-slate-400 font-mono">({filteredServices.length} Item)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredServices.map((s) => (
                <div
                  key={`svc-${s.id}`}
                  onClick={() => addToCart(s, "service")}
                  className="p-4 rounded-2xl bg-white/90 border hover:border-purple-500/50 cursor-pointer transition-all active:scale-[0.98] group"
                  style={{ borderColor: '#e9e6f2' }}
                >
                  <h3 className="text-sm font-bold truncate group-hover:text-purple-500" style={{ color: '#10224f' }}>{s.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs" style={{ color: '#6b7590' }}>{s.duration || 30} Menit</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold font-mono" style={{ color: '#7c5ce8' }}>{formatRp(s.price)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: '#7c5ce8', background: 'rgba(124,92,232,.1)', border: '1px solid rgba(124,92,232,.2)' }}>+ Tambah</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: PRODUK RETAIL & STOK (BAWAH) */}
          <div className="space-y-3 pt-4 border-t border-slate-200/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-500 flex items-center gap-2">
              <span>🧴 PRODUK RETAIL & STOK (PRODUCTS)</span>
              <span className="text-[10px] text-slate-400 font-mono">({filteredProducts.length} Item)</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <div
                  key={`prod-${p.id}`}
                  onClick={() => addToCart(p, "product")}
                  className="p-4 rounded-2xl bg-white/90 border border-slate-200 hover:border-purple-500/50 cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between group"
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-purple-500">{p.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Stok: <strong className="text-slate-700 font-mono">{p.stock} pcs</strong></p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-500 font-mono">{formatRp(p.price)}</span>
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-500 font-bold text-xs flex items-center justify-center">+</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP RIGHT SIDEBAR */}
      <div className="hidden md:flex md:w-96 md:flex-col md:h-full border-l border-slate-200">
        {renderCartInner()}
      </div>

      {/* MOBILE FLOATING BOTTOM CART BAR */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-500 relative">
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-zinc-950 font-bold text-[10px] flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Kasir</span>
            <span className="text-sm font-extrabold text-purple-500 font-mono">{formatRp(total)}</span>
          </div>
        </div>
        <button
          onClick={() => setCartOpenMobile(true)}
          className="px-5 py-2.5 rounded-xl bg-purple-500 text-zinc-950 font-bold text-xs shadow-lg shadow-purple-500/20 active:scale-95"
        >
          Lihat Keranjang ({cart.length})
        </button>
      </div>

      {/* MOBILE CART OVERLAY SLIDE-UP */}
      {cartOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-t border-slate-200 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setCartOpenMobile(false)}
              className="absolute top-3 right-3 p-2 text-slate-500 hover:text-slate-900 rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {renderCartInner()}
          </div>
        </div>
      )}

      <QrisModal
        isOpen={qrisOpen}
        onClose={() => setQrisOpen(false)}
        amount={total}
        customerName={customerName || "Pelanggan"}
        onSuccess={() => processOrder()}
      />
    </div>
  );
}
