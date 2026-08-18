"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();

  function handleLogout() {
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
              className="text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:bg-background transition-colors"
            >
              Log out
            </button>
          )}

          {!loading && !user && (
            <>
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
            </>
          )}
        </div>
      </div>
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
