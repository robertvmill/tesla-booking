'use client';

/**
 * Header Component
 * 
 * A responsive navigation header that includes:
 * - Logo and branding
 * - Main navigation menu with dropdown for vehicles
 * - Authentication state handling
 * - Unread message counter for inbox
 * - Admin section access for admin users
 *
 * Design Notes:
 * - Uses sticky positioning to remain visible while scrolling
 * - Implements a frosted glass effect with backdrop blur
 * - Responsive design: Full nav on desktop, collapses on mobile
 * - Hover states and active indicators for navigation items
 * - Badge counter for unread messages
 * - Consistent spacing and typography throughout
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [vehiclesMenuOpen, setVehiclesMenuOpen] = useState(false);
  
  // Access the isAdmin property safely
  const isAdmin = session?.user ? (session.user as {isAdmin?: boolean}).isAdmin : false;

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      if (session?.user) {
        try {
          const res = await fetch('/api/messages/unread');
          if (res.ok) {
            const data = await res.json();
            setUnreadCount(data.count);
          }
        } catch (error) {
          console.error('Failed to fetch unread messages:', error);
        }
      }
    };

    fetchUnreadMessages();
    
    // Refresh count every 60 seconds
    const interval = setInterval(fetchUnreadMessages, 60000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
          {/* Logo Section - Brand identity with icon */}
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-red-500" />
          <Link href="/" className="text-xl font-bold tracking-tight">
            RideReady
          </Link>
        </div>

          {/* Main Navigation - Desktop only (md+) */}
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/" className={`px-3 py-2 rounded-md font-medium ${pathname === "/" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black"}`}>
              Home
            </Link>
          <div className="relative">
            <button 
              className={`px-3 py-2 rounded-md font-medium ${pathname?.startsWith("/vehicles") ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black"}`}
              onClick={() => setVehiclesMenuOpen(!vehiclesMenuOpen)}
              onBlur={() => setTimeout(() => setVehiclesMenuOpen(false), 100)}
              aria-expanded={vehiclesMenuOpen}
            >
              Vehicles
            </button>
            {/* Vehicles Dropdown Menu */}
            <div 
              className={`absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md w-56 z-10 ${vehiclesMenuOpen ? 'block' : 'hidden'}`}
            >
              <Link href="/vehicles/model-s" className="block px-4 py-2 hover:bg-gray-100">Model S</Link>
              <Link href="/vehicles/model-3" className="block px-4 py-2 hover:bg-gray-100">Model 3</Link>
              <Link href="/vehicles/model-x" className="block px-4 py-2 hover:bg-gray-100">Model X</Link>
              <Link href="/vehicles/model-y" className="block px-4 py-2 hover:bg-gray-100">Model Y</Link>
            </div>
          </div>
          <Link href="/about" className={`px-3 py-2 rounded-md font-medium ${pathname === "/about" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black"}`}>
              About
            </Link>
          <Link href="/contact" className={`px-3 py-2 rounded-md font-medium ${pathname === "/contact" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black"}`}>
              Contact
            </Link>
          {/* Authenticated User Navigation Items */}
          {session?.user && (
            <Link href="/bookings" className={`px-3 py-2 rounded-md font-medium ${pathname === "/bookings" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black"}`}>
              My Bookings
            </Link>
          )}
          {session?.user && (
            <Link href="/inbox" className={`px-3 py-2 rounded-md font-medium relative ${pathname === "/inbox" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black"}`}>
              Inbox
              {/* Unread Message Counter Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {/* Admin Navigation - Only visible to admin users */}
          {session?.user && isAdmin && (
            <Link href="/admin" className={`px-3 py-2 rounded-md font-medium ${pathname?.startsWith("/admin") ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black"}`}>
              Admin
            </Link>
          )}
          </nav>

          {/* Authentication Section */}
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <span className="text-gray-700 hidden md:inline">
                Hello, {session.user.name 
                  ? session.user.name.split(' ')[0] // Get only the first name
                  : session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden md:block">
                <button className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">
                  Login
                </button>
              </Link>
              <Link href="/signup">
                <button className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">
              Sign Up
                </button>
            </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}