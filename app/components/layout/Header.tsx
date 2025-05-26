'use client';

/**
 * Header Component
 * 
 * A responsive navigation header that includes:
 * - Logo and branding
 * - Hamburger menu with dropdown navigation for all screen sizes
 * - Profile image display
 * - Authentication state handling
 * - Unread message counter for inbox
 * - Admin section access for admin users
 *
 * Design Notes:
 * - Uses sticky positioning to remain visible while scrolling
 * - Implements a frosted glass effect with backdrop blur
 * - Consistent hamburger menu design for both desktop and mobile
 * - Profile image with fallback to user initials
 * - Hover states and active indicators for navigation items
 * - Badge counter for unread messages
 * - Consistent spacing and typography throughout
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Access the isAdmin property safely
  const isAdmin = session?.user ? (session.user as {isAdmin?: boolean}).isAdmin : false;

  // Fetch unread message count
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

  useEffect(() => {
    // Fetch initial count
    fetchUnreadMessages();
    
    // Refresh count every 60 seconds
    const interval = setInterval(fetchUnreadMessages, 60000);
    
    // Listen for refresh events from ChatInterface
    const handleRefreshEvent = () => {
      fetchUnreadMessages();
    };
    
    window.addEventListener('refreshUnreadCount', handleRefreshEvent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshUnreadCount', handleRefreshEvent);
    };
  }, [session]);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Get user initials for fallback avatar
  const getUserInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">
          {/* Logo Section - Brand identity with icon */}
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-red-500" />
            <Link href="/" className="text-xl font-bold tracking-tight">
              RideReady
            </Link>
          </div>

          {/* Right side - Profile and Menu */}
          <div className="flex items-center gap-3">
            {/* Authentication Buttons - Only show when not authenticated */}
            {!session?.user && (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <button className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium">
                    Login
                  </button>
                </Link>
                <Link href="/signup">
                  <button className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm font-medium">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}

            {/* Profile Image - Only show when authenticated */}
            {session?.user && (
              <div className="flex items-center gap-2">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'Profile'}
                    className="h-8 w-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {getUserInitials(session.user.name, session.user.email)}
                  </div>
                )}
                <span className="hidden sm:block text-gray-700 text-sm">
                  {session.user.name 
                    ? session.user.name.split(' ')[0] // Get only the first name
                    : session.user.email}
                </span>
              </div>
            )}

            {/* Hamburger Menu Button */}
            <button
              className="p-2 rounded-md text-gray-700 hover:text-black hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40">
          {/* Invisible backdrop for click-outside functionality */}
          <div 
            className="fixed inset-0"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-16 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto w-full sm:w-80 md:w-96 m-2">
            <nav className="px-4 py-6 space-y-4">
              {/* Main Navigation Links */}
              <Link 
                href="/" 
                className={`block px-3 py-2 rounded-md font-medium ${pathname === "/" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black hover:bg-gray-50"}`}
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              
              <Link 
                href="/about" 
                className={`block px-3 py-2 rounded-md font-medium ${pathname === "/about" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black hover:bg-gray-50"}`}
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>
              
              <Link 
                href="/contact" 
                className={`block px-3 py-2 rounded-md font-medium ${pathname === "/contact" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black hover:bg-gray-50"}`}
                onClick={() => setMenuOpen(false)}
              >
                Contact
              </Link>

              {/* Authenticated User Links */}
              {session?.user && (
                <>
                  <Link 
                    href="/bookings" 
                    className={`block px-3 py-2 rounded-md font-medium ${pathname === "/bookings" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black hover:bg-gray-50"}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                  
                  <Link 
                    href="/inbox" 
                    className={`block px-3 py-2 rounded-md font-medium relative ${pathname === "/inbox" ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black hover:bg-gray-50"}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="flex items-center justify-between">
                      Inbox
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </span>
                  </Link>
                </>
              )}

              {/* Admin Link */}
              {session?.user && isAdmin && (
                <Link 
                  href="/admin" 
                  className={`block px-3 py-2 rounded-md font-bold ${pathname?.startsWith("/admin") ? "bg-gray-100 text-black" : "text-gray-700 hover:text-black hover:bg-gray-50"}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </Link>
              )}

              {/* Authentication Section */}
              <div className="border-t pt-4 mt-4">
                {session?.user ? (
                  <div className="space-y-3">
                    <div className="px-3 py-2 text-gray-700 flex items-center gap-3">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || 'Profile'}
                          className="h-10 w-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {getUserInitials(session.user.name, session.user.email)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {session.user.name || session.user.email}
                        </div>
                        {session.user.name && session.user.email && (
                          <div className="text-sm text-gray-500">
                            {session.user.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: '/' });
                        setMenuOpen(false);
                      }}
                      className="w-full bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      <button className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">
                        Login
                      </button>
                    </Link>
                    <Link href="/signup" onClick={() => setMenuOpen(false)}>
                      <button className="w-full px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">
                        Sign Up
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}