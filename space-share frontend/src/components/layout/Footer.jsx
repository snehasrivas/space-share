import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-surface-container-high border-t border-outline-variant/30 text-on-surface mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[20px]">celebration</span>
              </div>
              <span className="font-headline text-xl font-extrabold tracking-tight">
                Space<span className="text-primary">Share</span>
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              India's premier celebration space discovery and booking platform. Discover verified private lawns, terraces, boutique halls, and farmhouses.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-headline font-bold text-sm text-on-surface mb-3">Explore</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li>
                <Link to="/venues" className="hover:text-primary transition">All Venues</Link>
              </li>
              <li>
                <Link to="/venues?city=Bengaluru" className="hover:text-primary transition">Bengaluru Lawns</Link>
              </li>
              <li>
                <Link to="/venues?city=Mumbai" className="hover:text-primary transition">Mumbai Terraces</Link>
              </li>
              <li>
                <Link to="/venues?city=Delhi" className="hover:text-primary transition">Delhi Farmhouses</Link>
              </li>
            </ul>
          </div>

          {/* Host */}
          <div>
            <h4 className="font-headline font-bold text-sm text-on-surface mb-3">Host On SpaceShare</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li>
                <Link to="/signup?role=owner" className="hover:text-primary transition">List Your Space</Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="hover:text-primary transition">Host Dashboard</Link>
              </li>
              <li>
                <span className="text-on-surface-variant/80">Direct ₹ Payouts via Razorpay</span>
              </li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div>
            <h4 className="font-headline font-bold text-sm text-on-surface mb-3">100% Verified</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
              Every venue on SpaceShare undergoes rigorous document and in-person verification by our trust and safety team.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-container/15 text-tertiary text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Safe & Secure Booking
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <p>© {new Date().getFullYear()} SpaceShare Technologies. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span>Cancellation Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
