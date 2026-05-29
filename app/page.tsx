"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  stock_threshold?: number;
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

type Member = {
  id: number;
  name: string;
  phone: string;
  tier_id: number;
  total_points: number;
  total_spent: number;
  visit_count: number;
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

type StockAlert = {
  id: number;
  name: string;
  stock: number;
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

function formatNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

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

function generateReceiptText(data: ReceiptData): string {
  const lines = [
    "ROMEBOIS BARBERSHOP",
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
    `${data.date} ${data.time}`,
    `Order #${data.orderId}`,
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
  ];
  for (const item of data.items) {
    lines.push(
      `${item.name} x${item.qty}  ${formatRp(item.price * item.qty)}`
    );
  }
  lines.push(
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"
  );
  lines.push(`Subtotal  ${formatRp(data.subtotal)}`);
  if (data.discount > 0) {
    lines.push(`Discount  -${formatRp(data.discount)}`);
  }
  lines.push(`TOTAL     ${formatRp(data.total)}`);
  lines.push(
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"
  );
  lines.push(`Payment: ${data.paymentMethod}`);
  if (data.capsterName) {
    lines.push(`Capster: ${data.capsterName}`);
  }
  lines.push(
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"
  );
  lines.push("Terima kasih! \u{1F64F}");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Product categories for tab filtering                              */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "haircare", label: "Haircare" },
  { key: "styling", label: "Styling" },
  { key: "consumable", label: "Consumable" },
];

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
  const [activeTab, setActiveTab] = useState<"products" | "services">(
    "products"
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [detectedMember, setDetectedMember] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedCapsterId, setSelectedCapsterId] =
    useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  /* ---- receipt state --------------------------------------------- */
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  /* ---- inventory alerts ------------------------------------------ */
  const [lowStockItems, setLowStockItems] = useState<StockAlert[]>([]);
  const [outOfStockBanner, setOutOfStockBanner] = useState<string | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- fetch on mount -------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const [pRes, sRes, cRes] = await Promise.all([
          supabase.from("products").select("*").order("name"),
          supabase.from("services").select("*").order("name"),
          supabase
            .from("capsters")
            .select("*")
            .eq("active", true)
            .order("name"),
        ]);
        if (pRes.data) {
          setProducts(pRes.data);
          // Check low stock
          const low = pRes.data
            .filter(
              (p: Product) =>
                p.stock <= (p.stock_threshold ?? 5) &&
                p.category === "product"
            )
            .map((p: Product) => ({ id: p.id, name: p.name, stock: p.stock }));
          setLowStockItems(low);
          // Check for out of stock
          const outOfStock = pRes.data.find(
            (p: Product) => p.stock === 0 && p.category === "product"
          );
          if (outOfStock) {
            setOutOfStockBanner(
              `\u26A0\uFE0F ${(outOfStock as Product).name} habis!`
            );
            bannerTimer.current = setTimeout(() => {
              setOutOfStockBanner(null);
            }, 5000);
          }
        }
        if (sRes.data) setServices(sRes.data);
        if (cRes.data) setCapsters(cRes.data);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  /* ---- filtered items -------------------------------------------- */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (activeTab === "products") {
      let list = products.filter((p) => p.category === "product");
      if (activeCategory !== "all") {
        // Simple filtering by name hints or custom logic
        // In a real app this would use a category field
        list = list;
      }
      return list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.price).includes(q)
      );
    }
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || String(s.price).includes(q)
    );
  }, [activeTab, products, services, search, activeCategory]);

  // Separate consumables
  const consumables = useMemo(
    () => products.filter((p) => p.category === "consumable"),
    [products]
  );

  /* ---- cart helpers ---------------------------------------------- */
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

  const removeItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((ci) => ci.id !== id));
  }, []);

  const setItemCapster = useCallback(
    (id: string, capsterId: number) => {
      setCart((prev) =>
        prev.map((ci) => {
          if (ci.id !== id) return ci;
          const c = capsters.find((x) => x.id === capsterId);
          return { ...ci, capsterId, capsterName: c?.name };
        })
      );
    },
    [capsters]
  );

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
    }, 500);
    return () => clearTimeout(timeout);
  }, [customerPhone]);

  /* ---- process order --------------------------------------------- */
  const processOrder = useCallback(async () => {
    if (cart.length === 0) {
      setAlert({ type: "error", message: "Cart is empty." });
      return;
    }
    if (!customerName.trim()) {
      setAlert({
        type: "error",
        message: "Please enter customer name.",
      });
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
        const err = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const { dateStr, timeStr } = getDateTimeStrings();
      const capsterName =
        capsters.find((c) => c.id === selectedCapsterId)?.name ?? "";

      // Build receipt
      const receiptData: ReceiptData = {
        orderId: data.order_id ?? 0,
        date: dateStr,
        time: timeStr,
        items: cart.map((ci) => ({
          name: ci.name,
          qty: ci.qty,
          price: ci.price,
        })),
        subtotal,
        discount,
        total,
        paymentMethod: paymentMethod,
        capsterName,
      };
      setReceipt(receiptData);

      // Show success alert briefly
      setAlert({
        type: "success",
        message: `Order #${data.order_id ?? "\u2014"} processed!`,
      });

      // Reset form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      setDetectedMember(null);
      setCartOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to process order.";
      setAlert({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  }, [
    cart,
    customerName,
    customerPhone,
    subtotal,
    discount,
    total,
    paymentMethod,
    capsters,
    selectedCapsterId,
  ]);

  /* ---- receipt share --------------------------------------------- */
  const shareReceipt = useCallback(async () => {
    if (!receipt) return;
    const text = generateReceiptText(receipt);
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // Fallback to clipboard
        await navigator.clipboard.writeText(text);
        setAlert({
          type: "success",
          message: "Receipt copied to clipboard!",
        });
      }
    } else {
      await navigator.clipboard.writeText(text);
      setAlert({
        type: "success",
        message: "Receipt copied to clipboard!",
      });
    }
  }, [receipt, setAlert]);

  /* ---- product stock check helper -------------------------------- */
  const getStockWarning = (product: Product) => {
    if (product.stock <= 0) return { text: "Habis", color: "text-red-400" };
    if (
      product.stock_threshold &&
      product.stock <= product.stock_threshold
    ) {
      return {
        text: `\u26A0 Sisa ${product.stock}`,
        color: "text-amber-500",
      };
    }
    return null;
  };

  /* ---- loading skeleton ------------------------------------------ */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">Loading data\u2026</span>
        </div>
      </div>
    );
  }

  /* ---- render ---------------------------------------------------- */
  return (
    <div className="flex flex-col h-full relative">
      {/* Out of stock banner */}
      {outOfStockBanner && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-xs flex items-center justify-between">
          <span>{outOfStockBanner}</span>
          <button
            onClick={() => setOutOfStockBanner(null)}
            className="text-zinc-400 hover:text-zinc-200 ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Alert toast */}
      {alert && (
        <div
          className={`mx-3 mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
            alert.type === "success"
              ? "bg-emerald-900/40 border border-emerald-700 text-emerald-300"
              : "bg-red-900/40 border border-red-700 text-red-300"
          }`}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            className="ml-3 text-zinc-400 hover:text-zinc-200 text-base leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top bar: search + inventory alert */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={`Search ${activeTab}\u2026`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        {/* Inventory alert badge */}
        {lowStockItems.length > 0 && (
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className="relative flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold"
          >
            {"\u26A0\uFE0F"}
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold">
              {lowStockItems.length}
            </span>
          </button>
        )}
      </div>

      {/* Low stock dropdown */}
      {showLowStock && lowStockItems.length > 0 && (
        <div className="mx-3 mb-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-xs text-zinc-400 mb-2">
            Low Stock Items:
          </p>
          <div className="space-y-1.5">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-zinc-300 truncate mr-2">
                  {item.name}
                </span>
                <span
                  className={`flex-shrink-0 font-semibold ${
                    item.stock === 0 ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {item.stock === 0 ? "Habis" : `Sisa ${item.stock}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab switcher + capster row */}
      <div className="flex-shrink-0 px-3 flex items-center gap-2 mb-2">
        <div className="flex bg-zinc-800 rounded-lg p-0.5 flex-1">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "products"
                ? "bg-zinc-700 text-amber-400"
                : "text-zinc-500"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "services"
                ? "bg-zinc-700 text-amber-400"
                : "text-zinc-500"
            }`}
          >
            Services
          </button>
        </div>
        {/* Capster picker (compact) */}
        {activeTab === "services" && capsters.length > 0 && (
          <select
            value={selectedCapsterId ?? ""}
            onChange={(e) =>
              setSelectedCapsterId(
                e.target.value ? Number(e.target.value) : null
              )
            }
            className="flex-shrink-0 w-32 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
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

      {/* Category tabs (products only) */}
      {activeTab === "products" && (
        <div className="flex-shrink-0 px-3 mb-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat.key
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items area - scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-12">
            No {activeTab} found.
          </p>
        )}

        {activeTab === "products" && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((item) => {
              const product = item as Product;
              const stockWarn = getStockWarning(product);
              return (
                <button
                  key={`product-${item.id}`}
                  onClick={() => addToCart(item, "product")}
                  disabled={product.stock <= 0}
                  className="text-left p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-semibold text-amber-400">
                      {formatRp(item.price)}
                    </span>
                    {stockWarn && (
                      <span className={`text-[10px] ${stockWarn.color}`}>
                        {stockWarn.text}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "services" && filtered.length > 0 && (
          <div className="space-y-1.5">
            {filtered.map((item) => (
              <button
                key={`service-${item.id}`}
                onClick={() => addToCart(item, "service")}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] transition-all"
              >
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {item.name}
                  </p>
                  {"duration" in item && item.duration && (
                    <p className="text-[10px] text-zinc-500">
                      {item.duration} min
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-xs font-semibold text-amber-400">
                    {formatRp(item.price)}
                  </span>
                  <span className="w-6 h-6 flex items-center justify-center rounded bg-amber-500/20 text-amber-400 text-xs font-bold">
                    +
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Consumables section (shown in products tab) */}
        {activeTab === "products" && consumables.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 px-1">
              Consumables
            </p>
            <div className="grid grid-cols-2 gap-2">
              {consumables.map((item) => {
                const stockWarn = getStockWarning(item);
                return (
                  <button
                    key={`consumable-${item.id}`}
                    onClick={() => addToCart(item, "product")}
                    disabled={item.stock <= 0}
                    className="text-left p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-semibold text-amber-400">
                        {formatRp(item.price)}
                      </span>
                      {stockWarn && (
                        <span className={`text-[10px] ${stockWarn.color}`}>
                          {stockWarn.text}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom cart bar */}
      <div className="flex-shrink-0 px-3 pb-3">
        <button
          onClick={() => setCartOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-bold text-sm transition-all"
        >
          <span>
            {"\u{1F6D2}"} {cart.length} item{cart.length !== 1 ? "s" : ""}
          </span>
          <span>{formatRp(total)}</span>
        </button>
      </div>

      {/* Cart overlay */}
      {cartOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Bottom sheet cart */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-zinc-900 rounded-t-xl border-t border-zinc-800 max-h-[85vh] flex flex-col transition-transform duration-300 ${
          cartOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Cart header */}
        <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">
            Cart &middot; {cart.length} item{cart.length !== 1 ? "s" : ""}
          </h2>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-2">
              <span className="text-2xl">{"\u{1F6D2}"}</span>
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {cart.map((ci) => (
                <div
                  key={ci.id}
                  className="px-4 py-3 flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {ci.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {formatRp(ci.price)} &times; {ci.qty}
                    </p>
                    {ci.itemType === "service" && (
                      <select
                        value={ci.capsterId ?? ""}
                        onChange={(e) =>
                          setItemCapster(ci.id, Number(e.target.value))
                        }
                        className="mt-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="">No capster</option>
                        {capsters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {/* Redemption hint */}
                    {detectedMember &&
                      ci.itemType === "service" &&
                      detectedMember.total_points >= 50 && (
                        <p className="text-[10px] text-amber-500/70 mt-0.5">
                          {"\u{1F504}"} Redeem {Math.min(50, detectedMember.total_points)} pts available
                        </p>
                      )}
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateQty(ci.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs"
                    >
                      &minus;
                    </button>
                    <span className="w-6 text-center text-xs font-medium text-zinc-200">
                      {ci.qty}
                    </span>
                    <button
                      onClick={() => updateQty(ci.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Line total */}
                  <span className="w-20 text-right text-xs font-semibold text-zinc-200 flex-shrink-0">
                    {formatRp(ci.price * ci.qty)}
                  </span>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(ci.id)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 text-xs flex-shrink-0"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer: customer, payment, submit */}
        <div className="flex-shrink-0 border-t border-zinc-800 p-4 space-y-3">
          {/* Customer info */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              placeholder="Phone (08xxxx) — auto member"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
            {detectedMember && (
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-amber-400 font-semibold">
                  {"\u{1F451}"} {detectedMember.name}
                </p>
                <p className="text-[10px] text-amber-500/70 mt-0.5">
                  {formatNumber(detectedMember.total_points)} pts &middot;{" "}
                  {detectedMember.visit_count} visits &middot; Tier{" "}
                  {detectedMember.tier_id}
                </p>
              </div>
            )}
          </div>

          {/* Capster row (horizontal buttons) */}
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Capster</p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedCapsterId(null)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  selectedCapsterId === null
                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-500"
                }`}
              >
                None
              </button>
              {capsters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCapsterId(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    selectedCapsterId === c.id
                      ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-500"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Payment</p>
            <div className="flex gap-1.5">
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
                      : "bg-zinc-800 border border-zinc-700 text-zinc-500"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 flex-shrink-0">
              Discount
            </label>
            <input
              type="number"
              min={0}
              max={subtotal}
              value={discount || ""}
              onChange={(e) =>
                setDiscount(Math.max(0, Number(e.target.value) || 0))
              }
              className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400">Total</span>
            <span className="text-sm font-bold text-amber-400">
              {formatRp(total)}
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={processOrder}
            disabled={submitting || cart.length === 0}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 font-bold text-sm uppercase tracking-wider transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Processing\u2026
              </>
            ) : (
              "Process Order"
            )}
          </button>
        </div>
      </div>

      {/* Receipt modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-900 rounded-t-xl sm:rounded-xl border border-zinc-800 max-h-[90vh] overflow-y-auto">
            {/* Receipt header */}
            <div className="p-4 text-center border-b border-zinc-800">
              <h3 className="text-base font-bold tracking-widest text-amber-500">
                ROMEBOIS
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Barbershop</p>
            </div>

            {/* Receipt body */}
            <div className="p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>{receipt.date}</span>
                <span>{receipt.time}</span>
              </div>
              <div className="text-center text-zinc-300">
                Order #{receipt.orderId}
              </div>
              <div className="border-t border-zinc-800 my-2" />

              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-zinc-300 truncate mr-2">
                    {item.name} x{item.qty}
                  </span>
                  <span className="text-zinc-200 flex-shrink-0">
                    {formatRp(item.price * item.qty)}
                  </span>
                </div>
              ))}

              <div className="border-t border-zinc-800 my-2" />
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatRp(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount</span>
                  <span>-{formatRp(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-amber-400 font-bold">
                <span>TOTAL</span>
                <span>{formatRp(receipt.total)}</span>
              </div>
              <div className="border-t border-zinc-800 my-2" />
              <div className="flex justify-between text-zinc-400">
                <span>Payment</span>
                <span className="text-zinc-300 uppercase">
                  {receipt.paymentMethod}
                </span>
              </div>
              {receipt.capsterName && (
                <div className="flex justify-between text-zinc-400">
                  <span>Capster</span>
                  <span className="text-zinc-300">{receipt.capsterName}</span>
                </div>
              )}
              <div className="text-center text-zinc-500 pt-2">
                Terima kasih! {"\u{1F64F}"}
              </div>
            </div>

            {/* Receipt actions */}
            <div className="p-4 flex gap-2 border-t border-zinc-800">
              <button
                onClick={shareReceipt}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
              >
                Share
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
