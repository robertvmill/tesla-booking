import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        {/* Top section with newsletter */}
        <div className="py-6 border-b border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-white">Stay updated</h3>
              <p className="text-gray-400">Get the latest news and updates</p>
            </div>
            <div className="flex w-full md:w-1/3">
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-l-md focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-r-md text-white font-medium transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Main footer content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-8">
          <div>
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-red-600 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-xl font-bold text-white">Tesla Bookings</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Experience the future of driving with our premium Tesla fleet.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/vehicles" className="text-gray-400 hover:text-white transition-colors">Vehicles</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">Services</h3>
            <ul className="space-y-2">
              <li><Link href="/bookings" className="text-gray-400 hover:text-white transition-colors">My Bookings</Link></li>
              <li><Link href="/vehicles" className="text-gray-400 hover:text-white transition-colors">Browse Vehicles</Link></li>
              <li><Link href="/support" className="text-gray-400 hover:text-white transition-colors">Support</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <span className="text-gray-400">info@teslabookings.com</span>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <span className="text-gray-400">(123) 456-7890</span>
              </div>
              <p className="text-gray-400 mt-4">
                123 Electric Avenue<br />
                Toronto, ON M5V 2T6<br />
                Canada
              </p>
            </div>
          </div>
        </div>
        
        {/* Copyright section */}
        <div className="py-6 border-t border-gray-800 text-center sm:flex sm:justify-between sm:text-left">
          <p className="text-gray-400">© {currentYear} Tesla Bookings. All rights reserved.</p>
          <div className="mt-4 sm:mt-0">
            <Link href="/privacy" className="text-gray-400 hover:text-white mr-4 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}