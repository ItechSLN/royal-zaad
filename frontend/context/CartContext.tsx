'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
  /** The shop selling this listing. Carts saved before the marketplace have none. */
  shopId?: string | null;
  shopName?: string | null;
  shopSlug?: string | null;
};

export type CartShopGroup = {
  /** null for lines saved without shop info — shown under "Other". */
  shopId: string | null;
  shopName: string;
  shopSlug: string | null;
  items: CartItem[];
};

type CartContextValue = {
  items: CartItem[];
  /** Lines grouped under the shop that sells them, in the order first added. */
  groups: CartShopGroup[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  /** Estimate from the prices seen while browsing — checkout uses the server's quote. */
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "cart";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/** Accepts carts written by older versions of the storefront; drops unusable rows. */
const normalize = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row): CartItem[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const productId = str(r.productId);
    const price = Number(r.price);
    const quantity = Math.floor(Number(r.quantity));
    const stock = Math.floor(Number(r.stock));
    if (!productId || !Number.isFinite(price) || !(quantity > 0)) return [];
    return [
      {
        productId,
        name: str(r.name) ?? "Item",
        price,
        image: str(r.image),
        quantity,
        stock: Number.isFinite(stock) && stock > 0 ? stock : quantity,
        shopId: str(r.shopId),
        shopName: str(r.shopName),
        shopSlug: str(r.shopSlug),
      },
    ];
  });
};

export const groupCartByShop = (items: CartItem[]): CartShopGroup[] => {
  const groups = new Map<string, CartShopGroup>();
  for (const item of items) {
    const key = item.shopId ?? "__other__";
    let group = groups.get(key);
    if (!group) {
      group = {
        shopId: item.shopId ?? null,
        shopName: item.shopId ? item.shopName ?? "Shop" : "Other",
        shopSlug: item.shopId ? item.shopSlug ?? null : null,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  // Lines without a known shop go last.
  return [...groups.values()].sort((a, b) => Number(a.shopId === null) - Number(b.shopId === null));
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(normalize(JSON.parse(stored)));
      }
    } catch {
      // ignore corrupted cart data
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable — the cart still works for this visit
    }
  }, [items, hydrated]);

  const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, item.stock);
        return prev.map((i) =>
          i.productId === item.productId
            ? {
                ...i,
                quantity: nextQuantity,
                stock: item.stock,
                // Backfill the seller on lines saved before shops existed.
                shopId: item.shopId ?? i.shopId ?? null,
                shopName: item.shopName ?? i.shopName ?? null,
                shopSlug: item.shopSlug ?? i.shopSlug ?? null,
              }
            : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.stock) }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const groups = useMemo(() => groupCartByShop(items), [items]);
  const subtotal = useMemo(
    () => Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100,
    [items]
  );
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, groups, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
