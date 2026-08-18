"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    router.push("/");
  }

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-brand">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
          Inveni
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-brand transition-colors">
            Browse events
          </Link>
          {user && (
            <Link href="/dashboard" className="hover:text-brand transition-colors">
              My events
            </Link>
          )}
          {user && (
            <Link href="/tickets" className="hover:text-brand transition-colors">
              My tickets
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!loading && user && (
            <Link
              href="/cart"
              className="relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-background transition-colors"
              aria-label="Cart"
            >
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {!loading && user && (
            <Link
              href="/profile"
              className="hidden sm:inline text-sm text-muted hover:text-foreground transition-colors"
            >
              {user.first_name || user.username}
            </Link>
          )}

          {!loading && user && (
            <button
              onClick={handleLogout}
              className="hidden sm:inline-block text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-background transition-colors"
            >
              Log out
            </button>
          )}

          {!loading && !user && (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium px-3 py-1.5 rounded-full hover:bg-background transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium px-4 py-1.5 rounded-full bg-brand text-white hover:bg-brand-dark transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="sm:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-background transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="sm:hidden border-t border-border px-4 py-3 flex flex-col gap-1 text-sm font-medium">
          <Link
            href="/"
            className="py-2 hover:text-brand transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Browse events
          </Link>
          {user && (
            <>
              <Link
                href="/dashboard"
                className="py-2 hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                My events
              </Link>
              <Link
                href="/tickets"
                className="py-2 hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                My tickets
              </Link>
              <Link
                href="/profile"
                className="py-2 hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Profile ({user.first_name || user.username})
              </Link>
              <button
                onClick={handleLogout}
                className="py-2 text-left text-muted hover:text-foreground transition-colors"
              >
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link
                href="/login"
                className="py-2 hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="py-2 hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
