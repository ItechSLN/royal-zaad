"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import LocationPicker from "@/components/store/marketplace/LocationPicker";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const NAV_LINKS = [
  { label: "Products", href: "/products" },
  // { label: "Honey", href: "/products?search=honey" },
  // { label: "Coffee", href: "/products?search=coffee" },
  // { label: "Nuts", href: "/products?search=nuts" },
  { label: "Categories", href: "/categories" },
  { label: "Sell on Royal Zaad", href: "/vendor/register" },
];

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      search.trim() ? `/search?q=${encodeURIComponent(search.trim())}` : "/search"
    );
    setMobileOpen(false);
    setSearchOpen(false);
  };

  /**
   * The header is sticky, so anything else that sticks has to clear it.
   * Publishing the measured height keeps those offsets correct when the bar
   * reflows — the mobile menu opening, or the announcement wrapping.
   */
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const publish = () =>
      document.documentElement.style.setProperty(
        "--header-height",
        `${node.getBoundingClientRect().height}px`
      );

    publish();

    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-[var(--noir)]">
      {/* Announcement bar */}
      <div className="flex items-center justify-center bg-[var(--ink)] px-6 py-[11px] lg:px-12">
        <p className="font-body text-[10px] font-medium tracking-[1.6px] text-[var(--champagne)]">
          INDEPENDENT SHOPS · ONE BASKET · DELIVERY OR PICKUP NEAR YOU
        </p>
      </div>

      {/* Main nav */}
      <div className="flex items-center px-6 py-[26px] lg:px-12">
        <button
          type="button"
          className="mr-4 text-[var(--text-on-dark)] lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="hidden flex-1 items-center gap-[28px] lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-body text-[12px] font-medium tracking-[1.1px] text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className="flex flex-1 flex-col items-center gap-[3px]">
          <BrandMark size={30} className="text-[var(--gold)]" />
          <span className="font-display text-[26px] font-medium leading-none tracking-[6px] text-[var(--cream)]">
            ROYAL ZAAD
          </span>
          <span className="hidden font-body text-[7px] tracking-[2.6px] text-[var(--gold)] sm:block">
            ZAAD OF NATURAL LUXURY
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-[22px]">
          <LocationPicker />

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
          >
            <Search size={17} />
          </button>

          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Account menu"
              className="flex items-center text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
            >
              <User size={17} />
            </button>

            {accountOpen && (
              <div className="absolute right-0 z-50 mt-3 w-52 overflow-hidden rounded-[2px] border border-[var(--hairline)] bg-[var(--charcoal)] py-1">
                {user ? (
                  <>
                    <div className="border-b border-[var(--hairline)] px-4 py-2.5">
                      <p className="font-body text-[10px] tracking-[1px] text-[var(--text-muted-dark)]">
                        SIGNED IN AS
                      </p>
                      <p className="mt-0.5 font-body text-[12px] text-[var(--text-on-dark)]">
                        {user.email}
                      </p>
                    </div>
                    {[
                      { label: "My account", href: "/account" },
                      { label: "My orders", href: "/account/orders" },
                      { label: "Wishlist", href: "/account/wishlist" },
                    ].map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2.5 font-body text-[12px] text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
                      >
                        {l.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setAccountOpen(false);
                        router.push("/");
                      }}
                      className="w-full border-t border-[var(--hairline)] px-4 py-2.5 text-left font-body text-[12px] text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2.5 font-body text-[12px] text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2.5 font-body text-[12px] text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <Link
            href="/account/wishlist"
            aria-label="Wishlist"
            className="hidden text-[var(--text-on-dark)] transition hover:text-[var(--gold)] sm:block"
          >
            <Heart size={17} />
          </Link>

          <Link href="/cart" aria-label="Cart" className="flex items-center gap-[6px]">
            <ShoppingBag size={17} className="text-[var(--gold)]" />
            <span className="font-mono text-[11px] font-semibold text-[var(--gold)]">
              {itemCount}
            </span>
          </Link>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={handleSearch} className="border-t border-[var(--hairline)] px-6 py-4 lg:px-12">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the maison…"
            className="w-full bg-transparent font-body text-[13px] text-[var(--text-on-dark)] outline-none placeholder:text-[var(--text-muted-dark)]"
          />
        </form>
      )}

      {mobileOpen && (
        <div className="border-t border-[var(--hairline)] px-6 py-5 lg:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-body text-[12px] font-medium tracking-[1.1px] text-[var(--text-on-dark)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <div className="h-px w-full bg-[var(--hairline)]" />
    </header>
  );
}
