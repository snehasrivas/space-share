import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, profile, role, isOwner, isAdmin, isRenter, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold transition-colors ${
      isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
    }`;

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[24px]">celebration</span>
          </div>
          <span className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Space<span className="text-primary">Share</span>
          </span>
        </Link>

        {/* Desktop Navigation Links (Only visible after login) */}
        {user && (
          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/venues" className={navLinkClass}>
              Explore Venues
            </NavLink>

            {isRenter && (
              <NavLink to="/my-bookings" className={navLinkClass}>
                My Bookings
              </NavLink>
            )}

            {isOwner && (
              <>
                <NavLink to="/owner/dashboard" className={navLinkClass}>
                  My Venues
                </NavLink>
                <NavLink to="/owner/bookings" className={navLinkClass}>
                  Bookings Received
                </NavLink>
              </>
            )}

            {isAdmin && (
              <NavLink to="/admin/verifications" className={navLinkClass}>
                Verification Queue
              </NavLink>
            )}
          </nav>
        )}

        {/* Right Action CTA & Auth Buttons */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {/* Add Venue button (Only visible after login as Owner) */}
          {user && isOwner && (
            <Link
              to="/owner/venues/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-container text-white font-semibold text-xs hover:bg-primary transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Add Venue
            </Link>
          )}

          {/* User profile / Login dropdown */}
          {!user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-on-surface font-semibold text-sm hover:bg-secondary-container transition"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-container transition shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-outline-variant/30 hover:bg-surface-container transition"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-on-surface leading-tight truncate max-w-[120px]">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] uppercase font-semibold text-primary tracking-wider leading-tight">
                    {role}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest rounded-2xl shadow-modal border border-outline-variant/30 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-outline-variant/20">
                    <p className="text-xs font-bold text-on-surface truncate">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary-container text-on-secondary-container">
                      Role: {role}
                    </span>
                  </div>

                  {isRenter && (
                    <Link
                      to="/my-bookings"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        book_online
                      </span>
                      My Bookings
                    </Link>
                  )}

                  {isOwner && (
                    <>
                      <Link
                        to="/owner/dashboard"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          store
                        </span>
                        My Venues
                      </Link>
                      <Link
                        to="/owner/venues/new"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          add_circle
                        </span>
                        Add New Venue
                      </Link>
                      <Link
                        to="/owner/bookings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          receipt_long
                        </span>
                        Bookings Received
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin/verifications"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        verified_user
                      </span>
                      Verification Queue
                    </Link>
                  )}

                  <div className="border-t border-outline-variant/20 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-on-surface hover:bg-secondary-container transition"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-5 space-y-4">
          {user && (
            <>
              <NavLink
                to="/venues"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-semibold py-2 text-on-surface"
              >
                Explore Venues
              </NavLink>

              {isRenter && (
                <NavLink
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-base font-semibold py-2 text-on-surface"
                >
                  My Bookings
                </NavLink>
              )}

              {isOwner && (
                <>
                  <NavLink
                    to="/owner/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-base font-semibold py-2 text-on-surface"
                  >
                    My Venues
                  </NavLink>
                  <NavLink
                    to="/owner/venues/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-base font-semibold py-2 text-on-surface"
                  >
                    Add New Venue
                  </NavLink>
                  <NavLink
                    to="/owner/bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-base font-semibold py-2 text-on-surface"
                  >
                    Bookings Received
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <NavLink
                  to="/admin/verifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-base font-semibold py-2 text-on-surface"
                >
                  Verification Queue
                </NavLink>
              )}
            </>
          )}

          <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl border border-outline-variant/50 font-semibold text-sm"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-primary text-white font-semibold text-sm"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full text-center py-2.5 rounded-xl bg-error/10 text-error font-semibold text-sm"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
