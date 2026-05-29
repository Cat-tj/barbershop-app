"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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
  id: string; // unique cart-id (not db id)
  itemType: "product" | "service";
  productId?: number;
  serviceId?: number;
  name: string;
  price: number;
  qty: number;
  capsterId?: number;
  capsterName?: string;
};

type Member = {
  id: number;
  name: string;
  phone: string;
  tier_id: number;
  total_points: number;
  total_spent: number;
  visit_count: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

let cartIdCounter = 0;
function nextCartId() {
  return `cart-${++cartIdCounter}`;
}

function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function POSPage() {
  /* ---- data from Supabase ---------------------------------------- */
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [capsters, setCapsters] = useState<Capster[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---- UI state -------------------------------------------------- */
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [detectedMember, setDetectedMember] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedCapsterId, setSelectedCapsterId] = useState<number | null>(null);

  /* ---- fetch on mount -------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const [pRes, sRes, cRes] = await Promise.all([
          supabase.from("products").select("*").order("name"),
          supabase.from("services").select("*").order("name"),
          supabase.from("capsters").select("*").eq("active", true).order("name"),
        ]);
        if (pRes.data) setProducts(pRes.data);
        if (sRes.data) setServices(sRes.data);
        if (cRes.data) setCapsters(cRes.data);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ---- filtered items -------------------------------------------- */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (activeTab === "products") {
      return products.filter(
        (p) =>
          p.category === "product" &&
          (p.name.toLowerCase().includes(q) || String(p.price).includes(q))
      );
    }
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || String(s.price).includes(q)
    );
  }, [activeTab, products, services, search]);

  /* ---- cart helpers ---------------------------------------------- */
  const addToCart = useCallback(
    (item: Product | Service, itemType: "product" | "service") => {
      setCart((prev) => {
        // For services, we don't stack — always add a new line
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
        // For products, stack by productId
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

  const removeItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((ci) => ci.id !== id));
  }, []);

  const setItemCapster = useCallback((id: string, capsterId: number) => {
    setCart((prev) =>
      prev.map((ci) => {
        if (ci.id !== id) return ci;
        const c = capsters.find((x) => x.id === capsterId);
        return { ...ci, capsterId, capsterName: c?.name };
      })
    );
  }, [capsters]);

  /* ---- totals ---------------------------------------------------- */
  const subtotal = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.price * ci.qty, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);

  /* ---- member detection ------------------------------------------ */
  useEffect(() => {
    const phone = customerPhone.replace(/\D/g, "");
    if (phone.length < 6) {
      setDetectedMember(null);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      setDetectedMember(data ?? null);
    }, 400);
    return () => clearTimeout(timeout);
  }, [customerPhone]);

  /* ---- process order --------------------------------------------- */
  const processOrder = useCallback(async () => {
    if (cart.length === 0) {
      setAlert({ type: "error", message: "Cart is empty." });
      return;
    }
    if (!customerName.trim()) {
      setAlert({ type: "error", message: "Please enter customer name." });
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
            subtotal: ci.price * ci.qty,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const pointsEarned = data.points_earned ?? Math.floor(total / 1000);

      setAlert({
        type: "success",
        message: `Order #${data.order_id ?? "—"} processed! Total: ${formatRp(total)}. Member points earned: ${pointsEarned}.`,
      });

      // Reset
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      setDetectedMember(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process order.";
      setAlert({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  }, [cart, customerName, customerPhone, subtotal, discount, total, paymentMethod]);

  /* ---- loading skeleton ------------------------------------------ */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">Loading data…</span>
        </div>
      </div>
    );
  }

  /* ---- render ---------------------------------------------------- */
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Alert toast */}
      {alert && (
        <div
          className={`mx-4 mt-3 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${
            alert.type === "success"
              ? "bg-emerald-900/40 border border-emerald-700 text-emerald-300"
              : "bg-red-900/40 border border-red-700 text-red-300"
          }`}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            className="ml-3 text-zinc-400 hover:text-zinc-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main three-column layout */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* ======== LEFT PANEL — Items ======== */}
        <div className="w-[340px] flex-shrink-0 flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "products"
                  ? "text-amber-500 border-b-2 border-amber-500 bg-zinc-800/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "services"
                  ? "text-amber-500 border-b-2 border-amber-500 bg-zinc-800/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Services
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2.5">
            <input
              type="text"
              placeholder={`Search ${activeTab}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Service capster quick-select */}
          {activeTab === "services" && capsters.length > 0 && (
            <div className="px-3 pb-2">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">
                Assign Capster
              </label>
              <select
                value={selectedCapsterId ?? ""}
                onChange={(e) =>
                  setSelectedCapsterId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">— None (front-desk) —</option>
                {capsters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
            {filtered.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-8">
                No {activeTab} found.
              </p>
            )}
            {filtered.map((item) => (
              <button
                key={`${activeTab}-${item.id}`}
                onClick={() =>
                  addToCart(item, activeTab === "products" ? "product" : "service")
                }
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all text-left group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {item.name}
                  </p>
                  {"stock" in item && (
                    <p className="text-[11px] text-zinc-500">
                      Stock: {item.stock}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-amber-400 ml-3 flex-shrink-0 group-hover:text-amber-300 transition-colors">
                  {formatRp(item.price)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ======== CENTER — Cart ======== */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Cart &middot; {cart.length} item{cart.length !== 1 ? "s" : ""}
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                <span className="text-3xl">🛒</span>
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Tap products or services to add</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {cart.map((ci) => (
                  <div key={ci.id} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors">
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {ci.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatRp(ci.price)} &times; {ci.qty}
                      </p>
                      {/* Capster selector for services */}
                      {ci.itemType === "service" && (
                        <select
                          value={ci.capsterId ?? ""}
                          onChange={(e) =>
                            setItemCapster(ci.id, Number(e.target.value))
                          }
                          className="mt-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
                        >
                          <option value="">No capster</option>
                          {capsters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateQty(ci.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                      >
                        &minus;
                      </button>
                      <span className="w-7 text-center text-sm font-medium text-zinc-200 tabular-nums">
                        {ci.qty}
                      </span>
                      <button
                        onClick={() => updateQty(ci.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Line total + remove */}
                    <span className="w-24 text-right text-sm font-semibold text-zinc-200 tabular-nums flex-shrink-0">
                      {formatRp(ci.price * ci.qty)}
                    </span>
                    <button
                      onClick={() => removeItem(ci.id)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart footer — subtotal */}
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Subtotal</span>
            <span className="text-lg font-bold text-zinc-100 tabular-nums">
              {formatRp(subtotal)}
            </span>
          </div>
        </div>

        {/* ======== RIGHT PANEL — Customer & Payment ======== */}
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
          {/* Customer card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Customer
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">
                  Phone (auto-detect member)
                </label>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              {detectedMember && (
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-400 font-semibold">
                    👑 {detectedMember.name}
                  </p>
                  <p className="text-[11px] text-amber-500/70 mt-0.5">
                    {detectedMember.total_points} pts &middot;{" "}
                    {detectedMember.visit_count} visits &middot; Tier{" "}
                    {detectedMember.tier_id}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Payment
            </h3>
            <div className="space-y-3">
              {/* Method */}
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">
                  Method
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "cash", label: "Cash" },
                    { value: "qris", label: "QRIS" },
                    { value: "debit", label: "Debit" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        paymentMethod === m.value
                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                          : "bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">
                  Discount (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={discount || ""}
                  onChange={(e) =>
                    setDiscount(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-300">Total</span>
                <span className="text-xl font-bold text-amber-400 tabular-nums">
                  {formatRp(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Process button */}
          <button
            onClick={processOrder}
            disabled={submitting || cart.length === 0}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 font-bold text-sm uppercase tracking-wider transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              "💳 Process Order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
