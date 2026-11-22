import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { api, type BackendVenue, type BackendBooking, type AdminVerification, type BackendNotification } from './api'
import { ChatModal, type ActiveChatVenue } from './ChatModal'
import { NotificationHub } from './NotificationHub'
import { HostReceivedBookings } from './HostReceivedBookings'
import './mobile-nav.css'
import './detail-enhancements.css'
import './chat-notifications.css'
import {
  CITY_OPTIONS,
  HOME_TESTIMONIALS,
  VENUE_FAQS,
  CATEGORIZED_AMENITIES_MAP,
  FEATURED_DESTINATIONS,
  HOW_IT_WORKS_STEPS,
  getVenueReviews,
  addVenueReview,
  type VenueReview,
} from './venue-data'

// re-export for any legacy imports
export { supabase }

// ─── Types ──────────────────────────────────────────────────────────────────

type Page = 'home' | 'browse' | 'detail' | 'checkout' | 'bookings' | 'host' | 'admin' | 'auth' | 'owner-bookings'

interface VenueCardData {
  id: string
  name: string
  place: string
  price: string
  rating: string
  guests: string
  image: string
  tag: string
  _raw: BackendVenue
}

interface BookingDraft {
  venue_id: string
  venue_name: string
  venue_image: string
  venue_city: string
  booking_date: string
  start_time: string
  end_time: string
  guest_count: number
  total_amount: number
  venue_fee: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const photos = [
  'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1670529776180-60e4132ab90c?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1607861884586-c7cfaed16290?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1510076857177-7470076d4098?auto=format&fit=crop&w=1200&q=85',
]

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatPrice(n: number | null | undefined): string {
  if (!n) return '₹0'
  return '₹' + n.toLocaleString('en-IN')
}

function mapVenue(v: BackendVenue, idx: number): VenueCardData {
  const primaryImg =
    v.venue_images?.find(i => i.is_primary)?.image_url ||
    v.venue_images?.[0]?.image_url ||
    photos[idx % photos.length]
  return {
    id: v.id,
    name: v.title || 'Unnamed Venue',
    place: [v.city, v.state].filter(Boolean).join(', ') || v.address || 'India',
    price: formatPrice(v.price_per_day ?? v.price_per_hour),
    rating: '4.8',
    guests: v.capacity ? `Up to ${v.capacity} guests` : 'Flexible',
    image: primaryImg,
    tag: v.venue_event_types?.[0]?.event_type || 'Venue',
    _raw: v,
  }
}

// ─── Shared UI Components ────────────────────────────────────────────────────

function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  style,
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  style?: React.CSSProperties
}) {
  return (
    <button type={type} className={`button ${variant} ${className}`} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  )
}

function Input({
  label,
  placeholder,
  type = 'text',
  defaultValue,
  value,
  onChange,
  min,
  max,
}: {
  label?: string
  placeholder?: string
  type?: string
  defaultValue?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  min?: string | number
  max?: string | number
}) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
      />
    </label>
  )
}

function Logo({ go }: { go: (p: Page) => void }) {
  return (
    <button className="logo" onClick={() => go('home')} aria-label="SpaceShare home">
      <svg className="logo-mark" viewBox="0 0 48 48" role="img" aria-label="SpaceShare">
        <path className="logo-tile" d="M14 3h20c6.1 0 11 4.9 11 11v16c0 6.1-4.9 11-11 11h-6.4L21 46v-5h-7C7.9 41 3 36.1 3 30V14C3 7.9 7.9 3 14 3Z" />
        <path className="logo-door" d="M13.2 22.6 24 13l10.8 9.6v11.2H27v-8h-6v8h-7.8V22.6Z" />
        <path className="logo-share" d="M24 13v12.8" />
      </svg>
      <span className="wordmark"><span>Space</span>Share</span>
    </button>
  )
}

function Header({
  page, go, session, onSignOut, isAdmin, savedCount = 0, onOpenSaved,
  notifications = [], unreadNotifCount = 0, onOpenNotifications, onOpenChat, onMarkRead, onMarkAllRead,
  userRole = 'renter', onToggleRole,
}: {
  page: Page; go: (p: Page) => void; session: Session | null; onSignOut: () => void; isAdmin: boolean; savedCount?: number; onOpenSaved?: () => void
  notifications?: BackendNotification[]; unreadNotifCount?: number; onOpenNotifications?: () => void; onOpenChat?: (v: ActiveChatVenue) => void; onMarkRead?: (id: string) => void; onMarkAllRead?: () => void
  userRole?: string; onToggleRole?: (r: 'renter' | 'owner') => void
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)

  const navigate = (p: Page) => { go(p); setDrawerOpen(false) }

  return (
    <>
      <header className="header"><div className="nav-wrap"><Logo go={go} /><nav>
        <button className={page === 'home' ? 'active' : ''} onClick={() => go('home')}>Home</button>
        {userRole !== 'owner' ? (
          <>
            <button className={page === 'browse' ? 'active' : ''} onClick={() => go('browse')}>Explore venues</button>
            <button className={page === 'bookings' ? 'active' : ''} onClick={() => go('bookings')}>My bookings</button>
          </>
        ) : (
          <>
            <button className={page === 'host' ? 'active' : ''} onClick={() => go('host')}>List your space</button>
            <button className={page === 'owner-bookings' ? 'active' : ''} onClick={() => go('owner-bookings')}>Received bookings</button>
          </>
        )}
        {isAdmin && <button className={page === 'admin' ? 'active' : ''} onClick={() => go('admin')} style={{ color: page === 'admin' ? '#e07653' : '#e07653', fontWeight: 700 }}>🛡️ Admin</button>}
      </nav><div className="nav-actions">
        {/* Role Toggle Switcher: Guest vs Owner */}
        {onToggleRole && (
          <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 999, padding: '3px', border: '1.5px solid var(--line)', marginRight: 4 }}>
            <button
              onClick={() => {
                onToggleRole('renter')
                if (page === 'host' || page === 'owner-bookings') go('home')
              }}
              style={{
                border: 'none',
                background: userRole !== 'owner' ? 'var(--coral)' : 'transparent',
                color: userRole !== 'owner' ? '#ffffff' : '#6b7280',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Guest Mode: Explore venues & My Bookings"
            >
              👤 Guest
            </button>
            <button
              onClick={() => {
                onToggleRole('owner')
                if (page === 'browse' || page === 'bookings') go('host')
              }}
              style={{
                border: 'none',
                background: userRole === 'owner' ? 'var(--coral)' : 'transparent',
                color: userRole === 'owner' ? '#ffffff' : '#6b7280',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Owner Mode: List space & Received Bookings"
            >
              🏢 Owner
            </button>
          </div>
        )}

        {/* Notification Bell with Badge & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-button"
            aria-label="Notifications"
            style={{ position: 'relative' }}
            onClick={() => setNotifDropdownOpen(o => !o)}
          >
            🔔
            {unreadNotifCount > 0 && (
              <span className="heart-badge-count" style={{ background: 'var(--coral)' }}>
                {unreadNotifCount}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="header-notif-dropdown">
              <div className="dropdown-header">
                <h4>Notifications ({unreadNotifCount} unread)</h4>
                {unreadNotifCount > 0 && onMarkAllRead && (
                  <button
                    onClick={() => { onMarkAllRead() }}
                    style={{ background: 'none', border: 'none', fontSize: 11.5, color: 'var(--coral)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="dropdown-items">
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    No alerts right now
                  </div>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      className={`dropdown-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => {
                        if (onMarkRead) onMarkRead(n.id)
                        if (n.venue_id && onOpenChat) {
                          onOpenChat({ id: n.venue_id, title: n.venue_title || 'Event Venue' })
                          setNotifDropdownOpen(false)
                        } else if (onOpenNotifications) {
                          onOpenNotifications()
                          setNotifDropdownOpen(false)
                        }
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{n.type === 'message' ? '💬' : n.type === 'booking' ? '🎉' : '🔔'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{n.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                        {n.venue_id && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--coral)', marginTop: 4, display: 'inline-block' }}>
                            💬 Open Chat →
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="dropdown-footer">
                <button
                  className="dropdown-footer-link"
                  onClick={() => {
                    setNotifDropdownOpen(false)
                    if (onOpenNotifications) onOpenNotifications()
                    else go('home')
                  }}
                >
                  View All in Home Notification Tab →
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="icon-button"
          aria-label="Saved venues"
          style={{ position: 'relative' }}
          onClick={() => { if (onOpenSaved) onOpenSaved(); else go('browse') }}
        >
          {savedCount > 0 ? '❤️' : '♡'}
          {savedCount > 0 && <span className="heart-badge-count">{savedCount}</span>}
        </button>
        {session
          ? <Button variant="secondary" onClick={onSignOut}>Sign out</Button>
          : <Button variant="secondary" onClick={() => go('auth')}>Sign in</Button>}
        {/* Hamburger — visible only on mobile via CSS */}
        <button className={`hamburger${drawerOpen ? ' open' : ''}`} aria-label="Menu" onClick={() => setDrawerOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </div></div></header>

      {/* Mobile slide-in drawer */}
      <div className={`mobile-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="mobile-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
        <div className="mobile-drawer-panel">
          <div className="mobile-drawer-header">
            <span style={{ fontWeight: 800, fontSize: 18 }}>Menu</span>
            <button className="mobile-drawer-close" onClick={() => setDrawerOpen(false)}>×</button>
          </div>
          <nav className="mobile-drawer-nav">
            <button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')}>🏠 Home</button>
            <button onClick={() => { setDrawerOpen(false); if (onOpenNotifications) onOpenNotifications(); else navigate('home') }}>
              🔔 Notifications {unreadNotifCount > 0 ? `(${unreadNotifCount})` : ''}
            </button>
            {userRole !== 'owner' ? (
              <>
                <button className={page === 'browse' ? 'active' : ''} onClick={() => navigate('browse')}>🔍 Explore venues</button>
                <button className={page === 'bookings' ? 'active' : ''} onClick={() => navigate('bookings')}>📋 My bookings</button>
              </>
            ) : (
              <>
                <button className={page === 'host' ? 'active' : ''} onClick={() => navigate('host')}>🏛️ List your space</button>
                <button className={page === 'owner-bookings' ? 'active' : ''} onClick={() => navigate('owner-bookings')}>📥 Received bookings</button>
              </>
            )}
            {isAdmin && <button className={page === 'admin' ? 'active' : ''} onClick={() => navigate('admin')} style={{ color: '#e07653', fontWeight: 700 }}>🛡️ Admin panel</button>}
          </nav>
          <div className="mobile-drawer-footer">
            {onToggleRole && (
              <div style={{ margin: '0 0 14px', padding: '8px 12px', background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>MODE:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { onToggleRole('renter'); setDrawerOpen(false); if (page === 'host' || page === 'owner-bookings') go('home') }}
                    style={{ border: 'none', background: userRole !== 'owner' ? 'var(--coral)' : '#fff', color: userRole !== 'owner' ? '#fff' : '#374151', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    👤 Guest
                  </button>
                  <button
                    onClick={() => { onToggleRole('owner'); setDrawerOpen(false); if (page === 'browse' || page === 'bookings') go('owner-bookings') }}
                    style={{ border: 'none', background: userRole === 'owner' ? 'var(--coral)' : '#fff', color: userRole === 'owner' ? '#fff' : '#374151', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    🏢 Owner
                  </button>
                </div>
              </div>
            )}
            {session
              ? <Button className="wide" variant="secondary" onClick={() => { onSignOut(); setDrawerOpen(false) }}>Sign out</Button>
              : <Button className="wide" onClick={() => navigate('auth')}>Sign in</Button>}
          </div>
        </div>
      </div>
    </>
  )
}

function Footer({ go }: { go: (p: Page) => void }) {
  return <footer><div className="footer-grid"><div><Logo go={go} /><p>Joyful spaces for life's biggest moments. Discover trusted venues across India.</p></div><div><strong>Discover</strong><button onClick={() => go('browse')}>Browse venues</button><button>How it works</button><button>Trust & safety</button></div><div><strong>Host</strong><button onClick={() => go('host')}>List your venue</button><button>Host resources</button></div><div><strong>Support</strong><button>Help centre</button><button>Cancellation options</button><button>Contact us</button></div></div><div className="footer-bottom"><span>© 2026 SpaceShare India</span><span>Privacy · Terms · English (IN) · ₹ INR</span></div></footer>
}

function SearchBar({ go, onSelectCity }: { go: (p: Page) => void; onSelectCity?: (c: string) => void }) {
  const [selectedCity, setSelectedCity] = useState('Delhi NCR')
  const [selectedDate, setSelectedDate] = useState('')
  const [guestTier, setGuestTier] = useState('100–200 guests')
  const today = new Date().toISOString().split('T')[0]

  const handleSearch = () => {
    if (onSelectCity) onSelectCity(selectedCity)
    go('browse')
  }

  return (
    <div className="search-bar">
      <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 16px', borderRight: '1px solid var(--line)' }}>
        <small style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 2 }}>WHERE</small>
        <select
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
          style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: 13, padding: 0, outline: 'none', cursor: 'pointer', color: 'var(--ink)' }}
        >
          {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 16px', borderRight: '1px solid var(--line)' }}>
        <small style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 2 }}>WHEN</small>
        <input
          type="date"
          min={today}
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: 13, padding: 0, outline: 'none', cursor: 'pointer', color: 'var(--ink)' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 16px', borderRight: '1px solid var(--line)' }}>
        <small style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 2 }}>GUESTS</small>
        <select
          value={guestTier}
          onChange={e => setGuestTier(e.target.value)}
          style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: 13, padding: 0, outline: 'none', cursor: 'pointer', color: 'var(--ink)' }}
        >
          <option value="Up to 50 guests">Up to 50 guests</option>
          <option value="50–150 guests">50–150 guests</option>
          <option value="150–300 guests">150–300 guests</option>
          <option value="300+ guests">300+ guests</option>
        </select>
      </div>
      <Button onClick={handleSearch}>Search</Button>
    </div>
  )
}

function VenueCard({
  venue,
  onSelect,
  isSaved = false,
  onToggleSave,
}: {
  venue: VenueCardData
  onSelect: (v: VenueCardData) => void
  isSaved?: boolean
  onToggleSave?: (id: string) => void
}) {
  return (
    <article className="venue-card" onClick={() => onSelect(venue)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onSelect(venue)}>
      <div className="card-image">
        <img src={venue.image} alt={venue.name} />
        <span className="tag">{venue.tag}</span>
        <button
          className={`heart${isSaved ? ' saved' : ''}`}
          aria-label={`Save ${venue.name}`}
          onClick={e => {
            e.stopPropagation()
            onToggleSave?.(venue.id)
          }}
        >
          {isSaved ? '❤️' : '♡'}
        </button>
      </div>
      <div className="card-copy">
        <div>
          <h3>{venue.name}</h3>
          <p>{venue.place}</p>
        </div>
        <strong>★ {venue.rating}</strong>
      </div>
      <div className="card-meta">
        <span>{venue.guests}</span>
        <span>·</span>
        <span style={{ color: '#2e9e6b', fontWeight: 600 }}>✓ Verified</span>
      </div>
      <p className="price"><strong>{venue.price}</strong> / day</p>
    </article>
  )
}

// ─── Page: Home ──────────────────────────────────────────────────────────────

function Home({
  go,
  venuesList,
  loading,
  onSelectVenue,
  savedVenueIds = [],
  onToggleSave,
  onSelectCity,
  notifications = [],
  unreadNotifCount = 0,
  onMarkRead,
  onMarkAllRead,
  onOpenChat,
  activeHomeTab = 'venues',
  onSelectHomeTab,
  userRole = 'renter',
}: {
  go: (p: Page) => void
  venuesList: VenueCardData[]
  loading: boolean
  onSelectVenue: (v: VenueCardData) => void
  savedVenueIds?: string[]
  onToggleSave?: (id: string) => void
  onSelectCity?: (c: string) => void
  notifications?: BackendNotification[]
  unreadNotifCount?: number
  onMarkRead?: (id: string) => void
  onMarkAllRead?: () => void
  onOpenChat?: (v: ActiveChatVenue) => void
  activeHomeTab?: 'venues' | 'notifications'
  onSelectHomeTab?: (t: 'venues' | 'notifications') => void
  userRole?: string
}) {
  const [internalTab, setInternalTab] = useState<'venues' | 'notifications'>('venues')
  const currentTab = onSelectHomeTab ? activeHomeTab : internalTab
  const setTab = onSelectHomeTab || setInternalTab

  const [homeCategory, setHomeCategory] = useState('All')
  const [homeBudget, setHomeBudget] = useState('all')

  const displayedVenues = useMemo(() => {
    return venuesList.filter(v => {
      // Category filter
      const n = v.name.toLowerCase(), t = v.tag.toLowerCase()
      if (homeCategory === 'Farmhouses' && !(n.includes('farm') || t.includes('farm') || t.includes('lawn'))) return false
      if (homeCategory === 'Banquets' && !(n.includes('banquet') || t.includes('banquet') || n.includes('hall'))) return false
      if (homeCategory === 'Rooftops' && !(n.includes('rooftop') || t.includes('rooftop') || t.includes('open'))) return false
      if (homeCategory === 'Villas' && !(n.includes('villa') || t.includes('villa') || n.includes('resort') || t.includes('pool'))) return false

      // Budget filter
      const price = v._raw.price_per_day ?? v._raw.price_per_hour ?? 0
      if (homeBudget === 'under35' && price > 35000) return false
      if (homeBudget === '35to75' && (price < 35000 || price > 75000)) return false
      if (homeBudget === '75plus' && price < 75000) return false

      return true
    })
  }, [venuesList, homeCategory, homeBudget])

  return (
    <>
      <section className="hero">
        <div className="hero-image"></div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="eyebrow">Celebrate somewhere unforgettable</span>
          <h1>Find a space that feels <em>just right.</em></h1>
          <p>Verified venues for weddings, birthdays and every joyful gathering in between.</p>
          <SearchBar go={go} onSelectCity={onSelectCity} />
        </div>
      </section>

      {/* Floating Trust Metrics Strip - Decorated Cards with Hover Micro-Animations */}
      <div className="stats-strip">
        <div className="stat-box stat-coral">
          <div className="stat-top-row">
            <div className="stat-icon-wrap" style={{ background: '#fff3ee', color: '#ea580c' }}>🏛️</div>
            <span className="stat-pill-badge coral">✓ Verified</span>
          </div>
          <div className="stat-value-group">
            <strong>500+</strong>
          </div>
          <span className="stat-label">Verified Spaces</span>
          <small className="stat-subtext">Across 48+ Indian cities</small>
        </div>

        <div className="stat-box stat-amber">
          <div className="stat-top-row">
            <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>🎉</div>
            <span className="stat-pill-badge hot">🔥 Popular</span>
          </div>
          <div className="stat-value-group">
            <strong>50k+</strong>
          </div>
          <span className="stat-label">Celebrations Hosted</span>
          <small className="stat-subtext">Weddings, birthdays & offsites</small>
        </div>

        <div className="stat-box stat-gold">
          <div className="stat-top-row">
            <div className="stat-icon-wrap" style={{ background: '#fefce8', color: '#ca8a04' }}>⭐</div>
            <span className="stat-pill-badge star">★ Top Rated</span>
          </div>
          <div className="stat-value-group">
            <strong>4.92 ★</strong>
          </div>
          <span className="stat-label">Guest Satisfaction</span>
          <small className="stat-subtext">18,500+ verified reviews</small>
        </div>

        <div className="stat-box stat-emerald">
          <div className="stat-top-row">
            <div className="stat-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>🛡️</div>
            <span className="stat-pill-badge verified">✓ Shield 100%</span>
          </div>
          <div className="stat-value-group">
            <strong>100%</strong>
          </div>
          <span className="stat-label">Host KYC Checked</span>
          <small className="stat-subtext">On-site deed & photo audit</small>
        </div>
      </div>

      {/* Role Notice & Quick Action Banner for Venue Owners */}
      {userRole === 'owner' && (
        <div style={{ maxWidth: 1200, margin: '22px auto 0', padding: '0 24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2433 0%, #293044 100%)',
            color: '#fff',
            borderRadius: 18,
            padding: '20px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: '0 8px 24px rgba(31, 36, 51, 0.22)',
            border: '1.5px solid rgba(244, 98, 58, 0.45)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'rgba(244, 98, 58, 0.18)',
                border: '1.5px solid var(--coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
              }}>
                🏢
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    background: 'var(--coral)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 9px',
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                  }}>
                    Venue Owner Mode
                  </span>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>· Host Controls</span>
                </div>
                <h3 style={{ margin: '0 0 3px', fontSize: 18, color: '#fff' }}>
                  List your venue & manage received bookings
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#d1d5db' }}>
                  Add properties to earn rental income, or check guest inquiries and confirm incoming reservations.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => go('host')}
                style={{
                  background: 'var(--coral)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '10px 22px',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(244, 98, 58, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <span>🏛️ + List your space</span>
                <span>→</span>
              </button>
              <button
                onClick={() => go('owner-bookings')}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 999,
                  padding: '10px 18px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <span>📥 Received bookings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Unread Notification Alert Banner on Home Page */}
      {unreadNotifCount > 0 && currentTab !== 'notifications' && (
        <div style={{ maxWidth: 1200, margin: '20px auto 0', padding: '0 24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
            border: '1.5px solid #fdba74',
            borderRadius: 16,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 4px 14px rgba(244, 98, 58, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 26 }}>🔔</span>
              <div>
                <strong style={{ fontSize: 14, color: '#9a3412', display: 'block' }}>
                  You have {unreadNotifCount} unread host notification{unreadNotifCount > 1 ? 's' : ''}!
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#c2410c' }}>
                  Venue hosts have responded to your inquiries. Tap to read and chat live.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setTab('notifications')}
                style={{
                  background: 'var(--coral)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(244, 98, 58, 0.25)',
                }}
              >
                View Notifications ({unreadNotifCount}) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Home Page Navigation Tabs: Spaces vs Notifications */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        margin: '36px 0 20px',
        padding: '0 24px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setTab('venues')}
          style={{
            background: currentTab === 'venues' ? '#fff3ee' : '#ffffff',
            color: currentTab === 'venues' ? 'var(--coral)' : 'var(--ink)',
            border: currentTab === 'venues' ? '1.5px solid var(--coral)' : '1.5px solid var(--line)',
            borderRadius: 999,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: currentTab === 'venues' ? '0 4px 12px rgba(244, 98, 58, 0.15)' : '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>✨ Explore Handpicked Spaces</span>
        </button>

        <button
          onClick={() => setTab('notifications')}
          style={{
            background: currentTab === 'notifications' ? '#fff3ee' : '#ffffff',
            color: currentTab === 'notifications' ? 'var(--coral)' : 'var(--ink)',
            border: currentTab === 'notifications' ? '1.5px solid var(--coral)' : '1.5px solid var(--line)',
            borderRadius: 999,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: currentTab === 'notifications' ? '0 4px 12px rgba(244, 98, 58, 0.15)' : '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>🔔 Notifications & Messages</span>
          {unreadNotifCount > 0 && (
            <span style={{
              background: 'var(--coral)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 999,
            }}>
              {unreadNotifCount}
            </span>
          )}
        </button>
      </div>

      <main>
        {currentTab === 'notifications' ? (
          <section className="section" style={{ minHeight: 480, paddingTop: 10 }}>
            <NotificationHub
              notifications={notifications}
              unreadCount={unreadNotifCount}
              onMarkRead={onMarkRead || (() => {})}
              onMarkAllRead={onMarkAllRead || (() => {})}
              onOpenChat={onOpenChat || (() => {})}
              onGoToBrowse={() => setTab('venues')}
            />
          </section>
        ) : (
          <>
            {/* Curated Spaces with in-place Category and Budget filtering */}
            <section className="section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow coral">HANDPICKED FOR YOU</span>
                  <h2>Spaces worth celebrating in</h2>
                </div>
                <button className="text-link" onClick={() => go('browse')}>View all spaces ({venuesList.length}) →</button>
              </div>

          {/* Category Filter Pills on Dashboard */}
          <div className="dashboard-filter-bar">
            {[
              { label: '✨ All Spaces', val: 'All' },
              { label: '🏡 Farmhouses & Lawns', val: 'Farmhouses' },
              { label: '🏛️ Banquets & Halls', val: 'Banquets' },
              { label: '🌇 Rooftop & Open Air', val: 'Rooftops' },
              { label: '🏊 Poolside Villas', val: 'Villas' },
            ].map(cat => (
              <button
                key={cat.val}
                className={`dashboard-filter-pill${homeCategory === cat.val ? ' active' : ''}`}
                onClick={() => setHomeCategory(cat.val)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick budget chip toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em' }}>BUDGET:</span>
            {[
              { label: 'Any price', val: 'all' },
              { label: 'Under ₹35k', val: 'under35' },
              { label: '₹35k – ₹75k', val: '35to75' },
              { label: '₹75k+', val: '75plus' },
            ].map(b => (
              <button
                key={b.val}
                onClick={() => setHomeBudget(b.val)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: homeBudget === b.val ? 'var(--coral)' : 'var(--line)',
                  background: homeBudget === b.val ? '#fff3ee' : '#fff',
                  color: homeBudget === b.val ? 'var(--coral)' : '#4b5563',
                  cursor: 'pointer',
                }}
              >
                {b.label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
              Showing {displayedVenues.slice(0, 6).length} of {venuesList.length} spaces
            </span>
          </div>

          {loading ? (
            <p style={{ padding: '20px 0' }}>Loading venues…</p>
          ) : displayedVenues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 16, border: '1px dashed var(--line)' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔍</p>
              <h3 style={{ margin: '0 0 6px' }}>No venues found for this filter</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>Try switching categories or expanding your budget range.</p>
              <Button variant="secondary" onClick={() => { setHomeCategory('All'); setHomeBudget('all') }}>Reset dashboard filters</Button>
            </div>
          ) : (
            <div className="venue-grid">
              {displayedVenues.slice(0, 6).map(v => (
                <VenueCard
                  key={v.id}
                  venue={v}
                  onSelect={onSelectVenue}
                  isSaved={savedVenueIds.includes(v.id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          )}
        </section>

        {/* City Destination Spotlight Section */}
        <section className="section" style={{ paddingTop: 10 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow coral">EXPLORE BY DESTINATION</span>
              <h2>Top celebration cities</h2>
            </div>
            <button className="text-link" onClick={() => go('browse')}>View all cities →</button>
          </div>
          <div className="city-cards-grid">
            {FEATURED_DESTINATIONS.map(d => (
              <div
                key={d.city}
                className="city-card"
                onClick={() => {
                  onSelectCity?.(d.city)
                  go('browse')
                }}
              >
                <img src={d.image} alt={d.city} />
                <div className="city-card-overlay">
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 999, alignSelf: 'flex-start', marginBottom: 4 }}>
                    {d.tag}
                  </span>
                  <strong>{d.city}</strong>
                  <span>{d.area} · {d.venuesCount}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Occasions Band */}
        <section className="occasion-band">
          <span className="eyebrow">FIND YOUR PERFECT SETTING</span>
          <h2>What are you celebrating?</h2>
          <div className="occasion-grid">
            {[['Weddings', photos[4]], ['Birthdays', photos[1]], ['Corporate', photos[5]], ['Intimate gatherings', photos[2]]].map(([name, image]) => (
              <button key={name as string} onClick={() => go('browse')}>
                <img src={image as string} alt="" /><span>{name}<small>Explore venues →</small></span>
              </button>
            ))}
          </div>
        </section>

        {/* How It Works 3-Step Guide */}
        <section className="section" style={{ background: '#fff', maxWidth: 'none', margin: '40px 0', padding: '80px 28px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <span className="eyebrow coral">SEAMLESS HOSTING & BOOKING</span>
              <h2>How SpaceShare works for you</h2>
              <p style={{ color: 'var(--muted)', maxWidth: 550, margin: '8px auto 0' }}>
                From discovering dream venues to celebrating on the big day, we have every detail covered.
              </p>
            </div>
            <div className="how-it-works-grid">
              {HOW_IT_WORKS_STEPS.map(s => (
                <div key={s.num} className="how-it-works-card">
                  <div className="step-num-bubble">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real Community Reviews / Testimonials Section */}
        <section className="section" style={{ background: 'var(--sand)', padding: '70px 28px', maxWidth: 'none', margin: '0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="section-heading" style={{ textAlign: 'center', display: 'block', marginBottom: 40 }}>
              <span className="eyebrow coral">COMMUNITY VOICES</span>
              <h2>Organizers who celebrated with us</h2>
              <p style={{ color: 'var(--muted)', maxWidth: 600, margin: '8px auto 0' }}>
                Over 35,000 guests have walked through the doors of SpaceShare venues across India.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {HOME_TESTIMONIALS.map((t, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--line)', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.avatarColor, color: '#fff', fontWeight: 800, display: 'grid', placeItems: 'center', fontSize: 16 }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 15, color: 'var(--ink)' }}>{t.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t.city}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, color: '#f59e0b', fontSize: 14 }}>
                    {'★'.repeat(t.rating)}
                  </div>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'var(--sand)', color: 'var(--ink)', alignSelf: 'flex-start' }}>
                    {t.event}
                  </span>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151', margin: 0 }}>
                    "{t.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Space With Certainty Trust Section */}
        <section className="trust">
          <div>
            <span className="eyebrow coral">SPACE WITH CERTAINTY</span>
            <h2>Beautiful spaces.<br />No surprises.</h2>
            <p>Every venue is reviewed by our team so you can focus on the celebration, not the fine print.</p>
          </div>
          <div className="trust-list">
            <article><span>✓</span><div><h3>Personally verified</h3><p>Identity, ownership and venue details checked.</p></div></article>
            <article><span>₹</span><div><h3>Transparent pricing</h3><p>Clear inclusions and no hidden platform fees.</p></div></article>
            <article><span>◴</span><div><h3>Support that stays</h3><p>Help from enquiry through event day.</p></div></article>
          </div>
        </section>
          </>
        )}
      </main>
    </>
  )
}

// ─── Page: Browse ─────────────────────────────────────────────────────────────

function Browse({
  go,
  venuesList,
  loading,
  onSelectVenue,
  savedVenueIds = [],
  onToggleSave,
  initialCity = 'All India',
}: {
  go: (p: Page) => void
  venuesList: VenueCardData[]
  loading: boolean
  onSelectVenue: (v: VenueCardData) => void
  savedVenueIds?: string[]
  onToggleSave?: (id: string) => void
  initialCity?: string
}) {
  const [filter, setFilter] = useState('All spaces')
  const [cityFilter, setCityFilter] = useState(initialCity)
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'capacity'>('recommended')

  const filteredVenues = useMemo(() => {
    let list = venuesList.filter(v => {
      // Saved filter
      if (filter === 'Saved') return savedVenueIds.includes(v.id)

      // Category filter
      const n = v.name.toLowerCase(), t = v.tag.toLowerCase()
      if (filter === 'Farmhouses' && !(n.includes('farm') || t.includes('farm'))) return false
      if (filter === 'Banquet halls' && !(n.includes('banquet') || t.includes('banquet'))) return false
      if (filter === 'Rooftops' && !(n.includes('rooftop') || t.includes('rooftop'))) return false
      if (filter === 'Lawns' && !(n.includes('lawn') || t.includes('lawn'))) return false

      // City filter
      if (cityFilter !== 'All India') {
        const place = (v.place || '').toLowerCase()
        const targetCity = cityFilter.toLowerCase()
        if (!place.includes(targetCity)) return false
      }

      return true
    })

    // Sort
    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => {
        const pa = a._raw.price_per_day ?? a._raw.price_per_hour ?? 0
        const pb = b._raw.price_per_day ?? b._raw.price_per_hour ?? 0
        return pa - pb
      })
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => {
        const pa = a._raw.price_per_day ?? a._raw.price_per_hour ?? 0
        const pb = b._raw.price_per_day ?? b._raw.price_per_hour ?? 0
        return pb - pa
      })
    } else if (sortBy === 'capacity') {
      list = [...list].sort((a, b) => (b._raw.capacity ?? 0) - (a._raw.capacity ?? 0))
    }

    return list
  }, [venuesList, filter, cityFilter, sortBy, savedVenueIds])

  return (
    <main className="browse-page">
      {/* Return to Home Dashboard Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => go('home')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--white)',
            border: '1.5px solid var(--line)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(31,36,51,0.04)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--coral)'
            e.currentTarget.style.color = 'var(--coral)'
            e.currentTarget.style.transform = 'translateX(-3px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--line)'
            e.currentTarget.style.color = 'var(--ink)'
            e.currentTarget.style.transform = 'translateX(0)'
          }}
        >
          <span>🏠</span>
          <span>← Back to Home Dashboard</span>
        </button>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
          <span style={{ cursor: 'pointer', color: 'var(--coral)', fontWeight: 600 }} onClick={() => go('home')}>Home</span> / Explore Spaces
        </span>
      </div>

      <div className="browse-top">
        <span className="eyebrow coral">ALL INDIA</span>
        <h1>Spaces for your celebration</h1>
        <p>{venuesList.length} verified venues · prices shown before taxes</p>
      </div>

      {/* City quick filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16 }}>
        {CITY_OPTIONS.map(c => (
          <button
            key={c}
            onClick={() => setCityFilter(c)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid',
              borderColor: cityFilter === c ? 'var(--coral)' : 'var(--line)',
              background: cityFilter === c ? '#fff3ee' : '#fff',
              color: cityFilter === c ? 'var(--coral)' : '#4b5563',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            📍 {c}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="filter-row" style={{ marginTop: 10 }}>
        {['All spaces', 'Saved', 'Farmhouses', 'Banquet halls', 'Rooftops', 'Lawns'].map(f => (
          <button
            className={filter === f ? 'selected' : ''}
            onClick={() => setFilter(f)}
            key={f}
          >
            {f === 'Saved' ? `❤️ Saved (${savedVenueIds.length})` : f}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid var(--line)', fontSize: 13, fontWeight: 600, background: '#fff', cursor: 'pointer' }}
          >
            <option value="recommended">Sort: Recommended</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="capacity">Capacity: High to Low</option>
          </select>
        </div>
      </div>

      <div className="results-head">
        <strong>{filteredVenues.length} spaces available</strong>
        {cityFilter !== 'All India' && <span style={{ fontSize: 13, color: 'var(--muted)' }}>in {cityFilter}</span>}
      </div>

      {loading ? (
        <p style={{ padding: '40px 0', textAlign: 'center' }}>Loading spaces…</p>
      ) : filteredVenues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px dashed var(--line)' }}>
          <p style={{ fontSize: 36, margin: '0 0 10px' }}>🏛️</p>
          <h3>No venues match your current filters</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Try switching cities or selecting "All spaces".</p>
          <Button variant="secondary" onClick={() => { setFilter('All spaces'); setCityFilter('All India') }}>
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="venue-grid browse-grid">
          {filteredVenues.map(v => (
            <VenueCard
              key={v.id}
              venue={v}
              onSelect={onSelectVenue}
              isSaved={savedVenueIds.includes(v.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </main>
  )
}

// ─── Page: Detail ─────────────────────────────────────────────────────────────

function Detail({
  go,
  venue,
  session,
  onSetBookingDraft,
  isSaved = false,
  onToggleSave,
  onOpenChat,
}: {
  go: (p: Page) => void
  venue: VenueCardData | null
  session: Session | null
  onSetBookingDraft: (d: BookingDraft) => void
  isSaved?: boolean
  onToggleSave?: (id: string) => void
  onOpenChat?: (v: ActiveChatVenue) => void
}) {
  const [bookingDate, setBookingDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('22:00')
  const [guestCount, setGuestCount] = useState(100)
  const today = new Date().toISOString().split('T')[0]

  // UI Interactive States
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [inquiryTopic, setInquiryTopic] = useState('Catering & Outside Food')
  const [inquiryMsg, setInquiryMsg] = useState('')
  const [inquirySent, setInquirySent] = useState(false)
  const [showAllAmenities, setShowAllAmenities] = useState(false)
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0)

  // Reviews & Rating System
  const raw = venue?._raw
  const venueId = raw?.id || ''
  const venueTitle = venue?.name || 'Event Space'
  const venuePlace = venue?.place || 'India'

  const [reviews, setReviews] = useState<VenueReview[]>(() => {
    if (!raw) return []
    return getVenueReviews(raw.id, venueTitle, venuePlace)
  })
  const [reviewFilter, setReviewFilter] = useState('All')
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newName, setNewName] = useState(session?.user?.user_metadata?.full_name || '')
  const [newEventType, setNewEventType] = useState('30th Birthday Party')
  const [newComment, setNewComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  // Fetch live reviews and ratings from backend API
  useEffect(() => {
    if (!raw?.id) return
    api.getVenueReviews(raw.id)
      .then(res => {
        if (res && res.reviews && res.reviews.length > 0) {
          const mapped: VenueReview[] = res.reviews.map(r => ({
            id: r.id,
            venueId: r.venue_id,
            authorName: r.author_name,
            authorCity: r.author_city || 'India',
            date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recent',
            rating: Number(r.rating) || 5,
            eventType: r.event_type || 'Celebration',
            guestCount: r.guest_count || 100,
            comment: r.comment,
            verifiedStay: r.verified_stay !== false,
            hostReply: r.host_reply || undefined,
          }))
          setReviews(mapped)
        }
      })
      .catch(err => {
        console.warn('Backend reviews sync notice:', err)
      })
  }, [raw?.id])

  if (!venue || !raw) {
    return (
      <main style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p>No venue selected. <button style={{ color: 'var(--primary,#e07653)', textDecoration: 'underline' }} onClick={() => go('browse')}>Browse venues</button></p>
      </main>
    )
  }

  // All photos for gallery and lightbox
  const images = raw.venue_images && raw.venue_images.length > 0
    ? raw.venue_images.map(i => i.image_url)
    : [venue.image, photos[2], photos[1], photos[4], photos[3], photos[5]]

  const rawAmenities = Array.isArray(raw.amenities) ? raw.amenities : []

  // Pricing calculation
  const venueFee = raw.price_per_day ?? (raw.price_per_hour ? raw.price_per_hour * 12 : 45000)
  const cleaningFee = 3500
  const platformFee = Math.round(venueFee * 0.05)
  const total = venueFee + cleaningFee + platformFee

  // Average rating calculated dynamically from reviews
  const avgScore = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '4.9'

  const filteredReviews = reviews.filter(r => {
    if (reviewFilter === 'All') return true
    if (reviewFilter === 'Weddings') return r.eventType.toLowerCase().includes('wedding') || r.eventType.toLowerCase().includes('sangeet')
    if (reviewFilter === 'Birthdays') return r.eventType.toLowerCase().includes('birthday')
    if (reviewFilter === 'Corporate') return r.eventType.toLowerCase().includes('corporate') || r.eventType.toLowerCase().includes('gala')
    if (reviewFilter === 'Parties') return r.eventType.toLowerCase().includes('cocktail') || r.eventType.toLowerCase().includes('night') || r.eventType.toLowerCase().includes('gathering')
    return true
  })

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setToastMsg('✓ Link copied to clipboard!')
      setTimeout(() => setToastMsg(''), 3000)
    }
  }

  const handleToggleSave = () => {
    onToggleSave?.(venue.id)
    setToastMsg(isSaved ? 'Removed from saved venues' : '✓ Added to saved venues!')
    setTimeout(() => setToastMsg(''), 3000)
  }

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const author = newName.trim() || session?.user?.user_metadata?.full_name || 'Verified Guest'
    const authorCity = venuePlace.split(',')[0] || 'India'

    // Optimistic UI update
    const rev: VenueReview = {
      id: `${venue.id}-rev-${Date.now()}`,
      venueId: venue.id,
      authorName: author,
      authorCity,
      date: 'Just now',
      rating: newRating,
      eventType: newEventType,
      guestCount: guestCount || 100,
      comment: newComment.trim(),
      verifiedStay: true,
    }
    addVenueReview(venue.id, rev)
    setReviews(prev => [rev, ...prev])
    setReviewSubmitted(true)
    setShowWriteReview(false)
    setNewComment('')

    // Persist to backend database
    try {
      await api.addVenueReview(venue.id, {
        rating: newRating,
        comment: newComment.trim(),
        author_name: author,
        author_city: authorCity,
        event_type: newEventType,
        guest_count: guestCount || 100,
      })
    } catch (err) {
      console.warn('Backend review persistence note:', err)
    }

    setTimeout(() => setReviewSubmitted(false), 5000)
  }

  const handleSendInquiry = (e: FormEvent) => {
    e.preventDefault()
    setInquirySent(true)
    setTimeout(() => {
      setInquirySent(false)
      setContactModalOpen(false)
      setInquiryMsg('')
    }, 2500)
  }

  const handleRequestBook = () => {
    if (!bookingDate) { alert('Please select an event date.'); return }
    if (!session) {
      if (window.confirm('You need to sign in to book a venue. Go to sign in?')) go('auth')
      return
    }
    onSetBookingDraft({
      venue_id: raw.id,
      venue_name: venue.name,
      venue_image: venue.image,
      venue_city: venue.place,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      guest_count: guestCount,
      total_amount: total,
      venue_fee: venueFee,
    })
    go('checkout')
  }

  return (
    <main className="detail-page">
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 30, right: 30, background: 'var(--ink)', color: '#fff', padding: '12px 22px', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999, fontWeight: 600, fontSize: 14 }}>
          {toastMsg}
        </div>
      )}

      <button className="back" onClick={() => go('browse')}>← Back to results</button>

      {/* Title Bar */}
      <div className="detail-title">
        <div>
          <span className="tag inline">{venue.tag}</span>
          <h1>{venue.name}</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 0' }}>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {avgScore}</span>
            <span style={{ color: 'var(--muted)' }}>· {reviews.length} reviews · 📍 {venue.place}</span>
            <span style={{ color: '#2e9e6b', fontWeight: 600, fontSize: 12, background: '#eaf7f1', padding: '2px 8px', borderRadius: 999 }}>✓ 100% Verified</span>
          </p>
        </div>
        <div>
          <button className="share" onClick={handleShare}>↗ Share</button>
          <button className="share" onClick={handleToggleSave} style={{ color: isSaved ? '#e11d48' : 'inherit' }}>
            {isSaved ? '❤️ Saved' : '♡ Save'}
          </button>
        </div>
      </div>

      {/* Gallery with Fullscreen Lightbox Button */}
      <div className="gallery-wrap">
        <div className="gallery">
          {images.slice(0, 3).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${venue.name} view ${i + 1}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setLightboxIdx(i)}
            />
          ))}
        </div>
        <button className="gallery-view-all" onClick={() => setLightboxIdx(0)}>
          📷 View all {images.length} photos
        </button>
      </div>

      {/* Lightbox Modal */}
      {lightboxIdx !== null && (
        <div className="lightbox-overlay" onClick={() => setLightboxIdx(null)}>
          <div className="lightbox-header" onClick={e => e.stopPropagation()}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{venue.name} — Photo {lightboxIdx + 1} of {images.length}</span>
            <button className="lightbox-btn" onClick={() => setLightboxIdx(null)}>×</button>
          </div>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button
              className="lightbox-btn"
              style={{ position: 'absolute', left: 16 }}
              onClick={() => setLightboxIdx(prev => (prev! > 0 ? prev! - 1 : images.length - 1))}
            >
              ‹
            </button>
            <img src={images[lightboxIdx]} alt={`View ${lightboxIdx + 1}`} />
            <button
              className="lightbox-btn"
              style={{ position: 'absolute', right: 16 }}
              onClick={() => setLightboxIdx(prev => (prev! < images.length - 1 ? prev! + 1 : 0))}
            >
              ›
            </button>
          </div>
          <div className="lightbox-thumbs" onClick={e => e.stopPropagation()}>
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt=""
                className={`lightbox-thumb${lightboxIdx === idx ? ' active' : ''}`}
                onClick={() => setLightboxIdx(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Detail Grid Layout */}
      <div className="detail-layout">
        <div className="detail-content">

          {/* Quick Facts Strip */}
          <div className="facts">
            <div><strong>{raw.capacity || 150}</strong><span>max guests</span></div>
            <div><strong>{venue.tag || 'Lawn & Hall'}</strong><span>venue type</span></div>
            <div><strong>48 Hours</strong><span>free cancellation</span></div>
            <div><strong>Dedicated</strong><span>valet & parking</span></div>
          </div>

          {/* Venue Highlights Pill Cards */}
          <div className="highlights-strip">
            <div className="highlight-pill">
              <div className="highlight-icon">🏆</div>
              <div className="highlight-text">
                <strong>Guest Favorite</strong>
                <span>Top 5% of event spaces in {venuePlace}</span>
              </div>
            </div>
            <div className="highlight-pill">
              <div className="highlight-icon">🛡️</div>
              <div className="highlight-text">
                <strong>Verified Property</strong>
                <span>Legal ownership & KYC audited by SpaceShare</span>
              </div>
            </div>
            <div className="highlight-pill">
              <div className="highlight-icon">⚡</div>
              <div className="highlight-text">
                <strong>Fast Response Host</strong>
                <span>Typically replies in under 30 minutes</span>
              </div>
            </div>
            <div className="highlight-pill">
              <div className="highlight-icon">🎵</div>
              <div className="highlight-text">
                <strong>DJ & Acoustic Ready</strong>
                <span>Dedicated performance stage & power backup</span>
              </div>
            </div>
          </div>

          {/* About this space */}
          <section>
            <h2>About this space</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
              {raw.description ||
                `Welcome to ${venue.name}, a premier celebration venue nestled in ${venuePlace}. Beautifully curated for weddings, birthday soirees, cocktail evenings, and corporate galas, this space offers the ideal harmony of expansive manicured outdoors and opulent, air-conditioned indoor banquet halls. With dedicated green rooms, generator backup, and high-speed acoustic setups, your celebration is set to be unforgettable.`}
            </p>
          </section>

          {/* Categorized Amenities */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Amenities & facilities</h2>
              <button
                className="text-link"
                style={{ fontSize: 13, cursor: 'pointer' }}
                onClick={() => setShowAllAmenities(s => !s)}
              >
                {showAllAmenities ? 'Show less' : 'View all amenities'}
              </button>
            </div>
            <div className="amenity-categories">
              {CATEGORIZED_AMENITIES_MAP.slice(0, showAllAmenities ? undefined : 2).map((cat, idx) => (
                <div key={idx} className="amenity-cat-card">
                  <div className="amenity-cat-title">{cat.category}</div>
                  <div className="amenity-cat-list">
                    {cat.items.map((item, i) => (
                      <div key={i} className="amenity-item">
                        <span className="check">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {rawAmenities.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <strong style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>ADDITIONAL VENUE INCLUSIONS:</strong>
                <div className="amenities">
                  {rawAmenities.map((a: string) => <span key={a}>✓ {a}</span>)}
                </div>
              </div>
            )}
          </section>

          {/* Suitable for event types */}
          {raw.venue_event_types && raw.venue_event_types.length > 0 && (
            <section>
              <h2>Suitable celebrations</h2>
              <div className="amenities">
                {raw.venue_event_types.map((et: any) => <span key={et.id}>🎉 {et.event_type}</span>)}
              </div>
            </section>
          )}

          {/* Host Profile Card */}
          <section>
            <h2>Meet your Host</h2>
            <div className="host-card">
              <div className="host-avatar">
                {((raw as any).profiles?.full_name?.[0] || venueTitle[0] || 'H').toUpperCase()}
              </div>
              <div className="host-info">
                <div className="host-name">
                  <span>{(raw as any).profiles?.full_name || 'SpaceShare Verified Host'}</span>
                  <span className="host-badge-pill">★ Superhost</span>
                </div>
                <p className="host-meta">Verified venue partner · Hosting since 2024</p>
                <div className="host-metrics">
                  <span>💬 <strong>100%</strong> response rate</span>
                  <span>⚡ <strong>&lt; 30 mins</strong> response time</span>
                  <span>🛡️ <strong>Identity</strong> verified</span>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  if (onOpenChat && venue) {
                    onOpenChat({
                      id: venue.id,
                      title: venueTitle,
                      image: (venue as any).image,
                      city: (venue as any).city,
                      hostName: (raw as any).profiles?.full_name || 'Rajesh Verma (Host)',
                    })
                  } else {
                    setContactModalOpen(true)
                  }
                }}
              >
                💬 Message Host
              </Button>
            </div>
          </section>

          {/* ─── Ratings & Reviews Section (Core requested feature) ─── */}
          <section className="reviews-section">
            <div className="reviews-header">
              <div>
                <span className="eyebrow coral">GUEST EXPERIENCES</span>
                <h2 style={{ margin: '6px 0 4px' }}>Ratings & Reviews</h2>
                <div className="rating-big-score">
                  <span className="rating-big-num">★ {avgScore}</span>
                  <div>
                    <div className="rating-stars-gold">★★★★★</div>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                      Based on {reviews.length} verified organizer reviews · 98% recommended
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowWriteReview(s => !s)}>
                {showWriteReview ? 'Close review form' : '✍️ Write a Review'}
              </Button>
            </div>

            {/* Rating Category Breakdown Bars */}
            <div className="rating-bars-grid">
              <div className="rating-bar-row">
                <span className="rating-bar-label">Cleanliness & Hygiene</span>
                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: '98%' }} /></div>
                <span className="rating-bar-val">4.9</span>
              </div>
              <div className="rating-bar-row">
                <span className="rating-bar-label">Host & Staff Hospitality</span>
                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: '100%' }} /></div>
                <span className="rating-bar-val">5.0</span>
              </div>
              <div className="rating-bar-row">
                <span className="rating-bar-label">Listing & Photo Accuracy</span>
                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: '96%' }} /></div>
                <span className="rating-bar-val">4.8</span>
              </div>
              <div className="rating-bar-row">
                <span className="rating-bar-label">Sound & Stage Setup</span>
                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: '98%' }} /></div>
                <span className="rating-bar-val">4.9</span>
              </div>
              <div className="rating-bar-row">
                <span className="rating-bar-label">Location & Easy Parking</span>
                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: '98%' }} /></div>
                <span className="rating-bar-val">4.9</span>
              </div>
              <div className="rating-bar-row">
                <span className="rating-bar-label">Value for Money</span>
                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: '96%' }} /></div>
                <span className="rating-bar-val">4.8</span>
              </div>
            </div>

            {/* Success notification if review submitted */}
            {reviewSubmitted && (
              <div style={{ background: '#eaf7f1', border: '1px solid #bbf7d0', borderRadius: 14, padding: '16px 20px', marginBottom: 24, color: '#166534', fontWeight: 600 }}>
                🎉 Thank you! Your review has been submitted and published for {venue.name}.
              </div>
            )}

            {/* Interactive Write a Review Card */}
            {showWriteReview && (
              <form onSubmit={handleAddReview} className="write-review-card">
                <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Share your event experience</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>Help future event hosts know what made your celebration special.</p>

                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Your Overall Rating *</label>
                <div className="star-rating-select">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setNewRating(star)}
                      style={{ color: star <= newRating ? '#f59e0b' : '#d1d5db' }}
                    >
                      ★
                    </span>
                  ))}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', alignSelf: 'center', marginLeft: 8 }}>
                    {newRating === 5 ? 'Exceptional' : newRating === 4 ? 'Very Good' : newRating === 3 ? 'Average' : 'Needs improvement'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>YOUR NAME *</span>
                    <input
                      type="text"
                      placeholder="e.g. Ananya Deshmukh"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field" style={{ margin: 0 }}>
                    <span>EVENT TYPE *</span>
                    <select
                      value={newEventType}
                      onChange={e => setNewEventType(e.target.value)}
                      style={{ height: 46 }}
                    >
                      <option value="Wedding / Sangeet">Wedding / Sangeet</option>
                      <option value="30th Birthday Party">Birthday Party</option>
                      <option value="Corporate Offsite & Dinner">Corporate Offsite / Gala</option>
                      <option value="Cocktail & Music Night">Cocktail & Music Night</option>
                      <option value="Anniversary Gathering">Anniversary Gathering</option>
                      <option value="Photoshoot / Production">Photoshoot / Production</option>
                    </select>
                  </label>
                </div>

                <label className="field" style={{ margin: '0 0 16px' }}>
                  <span>YOUR REVIEW *</span>
                  <textarea
                    rows={4}
                    placeholder="Tell us about the atmosphere, sound, parking, and host cooperation..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    required
                  />
                </label>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setShowWriteReview(false)}>Cancel</Button>
                  <Button type="submit">Publish Review</Button>
                </div>
              </form>
            )}

            {/* Filter pills */}
            <div className="review-filter-pills">
              {['All', 'Weddings', 'Birthdays', 'Corporate', 'Parties'].map(f => (
                <button
                  key={f}
                  className={reviewFilter === f ? 'active' : ''}
                  onClick={() => setReviewFilter(f)}
                >
                  {f === 'All' ? `All Reviews (${reviews.length})` : f}
                </button>
              ))}
            </div>

            {/* Reviews Cards List */}
            <div className="review-cards-grid">
              {filteredReviews.map(r => (
                <div key={r.id} className="review-card-item">
                  <div className="reviewer-head">
                    <div className="reviewer-avatar">
                      {r.authorName[0]}
                    </div>
                    <div className="reviewer-meta">
                      <h4>{r.authorName}</h4>
                      <span>{r.authorCity} · {r.date}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: 15 }}>
                      {'★'.repeat(r.rating)}
                    </div>
                  </div>

                  <span className="review-badge-tag">
                    🎉 {r.eventType} · {r.guestCount} guests
                  </span>

                  <p className="review-body-text">
                    "{r.comment}"
                  </p>

                  {r.hostReply && (
                    <div className="review-host-reply">
                      <strong>Host reply:</strong> {r.hostReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Venue Rules & Policies */}
          <section>
            <h2>Venue rules & policies</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              {raw.rules || 'Please adhere to local decibel regulations after 10:00 PM. No open flames on indoor wooden stages.'}
            </p>
            <div className="faq-grid">
              {VENUE_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="faq-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                >
                  <div className="faq-question">
                    <span>{openFaqIdx === idx ? '▾' : '▸'}</span>
                    <span>{faq.question}</span>
                  </div>
                  {openFaqIdx === idx && (
                    <p className="faq-answer">{faq.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Location & Getting there */}
          <section>
            <h2>Location & Neighborhood</h2>
            <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>📍</span>
                <div>
                  <strong style={{ fontSize: 16, color: 'var(--ink)' }}>{raw.address || venue.place}</strong>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{venue.place} · Pin: {raw.pincode || (raw as any).zip_code || 'Verified'}</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#4b5563', margin: '8px 0 0', lineHeight: 1.6 }}>
                🚗 <strong>Arrival guidance:</strong> Easily navigable via Google Maps. Wide asphalt access road accommodating buses and delivery vans. Valet counter located directly outside the main gate.
              </p>
              <div style={{ background: 'var(--sand)', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
                🔒 Exact venue entry code and security gate contact provided automatically upon booking confirmation.
              </div>
            </div>
          </section>

        </div>

        {/* ─── Sticky Booking & Payment Card ─── */}
        <aside className="booking-card">
          <p>
            <strong>{formatPrice(raw.price_per_day ?? raw.price_per_hour)}</strong>
            {raw.price_per_day ? ' / day' : ' / hour'}
          </p>

          <div style={{ background: '#fff3ee', border: '1px solid #ffd5c4', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--coral)', fontWeight: 600, marginBottom: 14 }}>
            ⚡ High demand: 4 other organizers viewed this date
          </div>

          <div className="date-grid">
            <label className="field">
              <span>EVENT DATE</span>
              <input type="date" value={bookingDate} min={today} onChange={e => setBookingDate(e.target.value)} />
            </label>
            <label className="field">
              <span>GUESTS</span>
              <input type="number" value={guestCount} min={1} max={raw.capacity ?? 9999} onChange={e => setGuestCount(Number(e.target.value))} />
            </label>
          </div>

          <div className="date-grid">
            <label className="field">
              <span>START TIME</span>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </label>
            <label className="field">
              <span>END TIME</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </label>
          </div>

          <div className="price-line">
            <span>Venue hire ({raw.price_per_day ? 'Full Day slot' : '12 hrs'})</span>
            <span>{formatPrice(venueFee)}</span>
          </div>
          <div className="price-line">
            <span>Cleaning & sanitization</span>
            <span>{formatPrice(cleaningFee)}</span>
          </div>
          <div className="price-line">
            <span>SpaceShare service fee (5%)</span>
            <span>{formatPrice(platformFee)}</span>
          </div>
          <div className="price-line total">
            <strong>Total Amount</strong>
            <strong style={{ fontSize: 20, color: 'var(--coral)' }}>{formatPrice(total)}</strong>
          </div>

          <Button className="wide" onClick={handleRequestBook}>
            Request to book
          </Button>
          <small>You won't be charged until host confirms availability</small>
          <div className="safe">
            ✓ Free cancellation within 48 hours · 100% money back
          </div>
        </aside>
      </div>

      {/* Contact Host Modal */}
      {contactModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setContactModalOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, maxWidth: 500, width: '100%', padding: '32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 20 }}>Message {(raw as any).profiles?.full_name || 'Host'}</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>Ask about catering rules, decorations, DJ extensions, or custom quotes.</p>

            {inquirySent ? (
              <div style={{ background: '#eaf7f1', color: '#166534', padding: '20px', borderRadius: 14, textAlign: 'center', fontWeight: 600 }}>
                ✓ Inquiry sent! The host typically replies within 30 minutes.
              </div>
            ) : (
              <form onSubmit={handleSendInquiry}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>INQUIRY TOPIC</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {['Catering & Outside Food', 'DJ & Music Curfew', 'Decorators & Setup Time', 'Discount for Weekday'].map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setInquiryTopic(topic)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: inquiryTopic === topic ? 'var(--coral)' : 'var(--line)',
                        background: inquiryTopic === topic ? '#fff3ee' : '#fff',
                        color: inquiryTopic === topic ? 'var(--coral)' : '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>

                <label className="field" style={{ margin: '0 0 18px' }}>
                  <span>YOUR MESSAGE</span>
                  <textarea
                    rows={4}
                    placeholder={`Hi, I'm interested in booking ${venue.name} for an event. Could you clarify...`}
                    value={inquiryMsg}
                    onChange={e => setInquiryMsg(e.target.value)}
                    required
                  />
                </label>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setContactModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Send Message</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Page: Checkout ───────────────────────────────────────────────────────────

function Checkout({ go, session, bookingDraft }: {
  go: (p: Page) => void; session: Session | null; bookingDraft: BookingDraft | null
}) {
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [error, setError] = useState('')

  if (!bookingDraft) {
    return (
      <main style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p>No booking in progress. <button style={{ color: 'var(--primary,#e07653)', textDecoration: 'underline' }} onClick={() => go('browse')}>Browse venues</button></p>
      </main>
    )
  }

  if (confirmed) {
    return (
      <main className="success-page">
        <div className="success-mark">✓</div>
        <span className="eyebrow coral">BOOKING CONFIRMED</span>
        <h1>Your celebration is on the calendar.</h1>
        <p>We've sent the details to you and the host. Your booking reference is <strong>{bookingRef}</strong>.</p>
        <Button onClick={() => go('bookings')}>View my booking</Button>
      </main>
    )
  }

  const handleConfirm = async () => {
    if (!session) { go('auth'); return }
    setSubmitting(true); setError('')
    try {
      const result = await api.createBooking({ venue_id: bookingDraft.venue_id, booking_date: bookingDraft.booking_date, start_time: bookingDraft.start_time, end_time: bookingDraft.end_time, total_amount: bookingDraft.total_amount })
      setBookingRef(`SS-${result.booking.id.substring(0, 6).toUpperCase()}`)
      setConfirmed(true)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="checkout">
      <button className="back" onClick={() => go('detail')}>← Back to venue</button>
      <div className="checkout-grid">
        <div>
          <span className="eyebrow coral">ONE LAST STEP</span>
          <h1>Confirm and pay</h1>
          <section className="form-card">
            <h2>Your event</h2>
            <div className="summary-row"><span>{bookingDraft.booking_date} · {bookingDraft.start_time}–{bookingDraft.end_time}</span></div>
            <div className="summary-row"><span>{bookingDraft.guest_count} guests · {bookingDraft.venue_name}</span></div>
          </section>
          <section className="form-card">
            <h2>Payment details</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              💳 Razorpay payment integration coming soon. Your booking will be saved as <strong>pending payment</strong>.
            </p>
            <Input label="Name on card" placeholder="Full name" />
            <Input label="Card number" placeholder="1234 5678 9012 3456" />
            <div className="date-grid"><Input label="Expiry" placeholder="MM / YY" /><Input label="CVV" placeholder="123" /></div>
            <label className="check"><input type="checkbox" defaultChecked /> Save card securely for future bookings</label>
          </section>
          {error && <p style={{ color: '#dc2626', padding: '12px 16px', background: '#fef2f2', borderRadius: '8px', margin: '16px 0', fontSize: '14px' }}>⚠️ {error}</p>}
        </div>
        <aside className="order-card">
          <img src={bookingDraft.venue_image} alt="" />
          <h3>{bookingDraft.venue_name}</h3>
          <p>{bookingDraft.venue_city}</p>
          <div className="price-line"><span>Venue hire</span><span>{formatPrice(bookingDraft.venue_fee)}</span></div>
          <div className="price-line"><span>Fees & taxes</span><span>{formatPrice(bookingDraft.total_amount - bookingDraft.venue_fee)}</span></div>
          <div className="price-line total"><strong>Total due</strong><strong>{formatPrice(bookingDraft.total_amount)}</strong></div>
          <Button className="wide" onClick={handleConfirm} disabled={submitting}>{submitting ? 'Confirming…' : 'Confirm booking'}</Button>
          <small>Secure, encrypted payment</small>
        </aside>
      </div>
    </main>
  )
}

// ─── Page: Bookings ───────────────────────────────────────────────────────────

interface BookingsProps {
  go: (p: Page) => void
  session: Session | null
  savedVenueIds?: string[]
  allVenues?: VenueCardData[]
  onSelectVenue?: (venue: VenueCardData) => void
  onToggleSave?: (venueId: string) => void
  onOpenChat?: (v: ActiveChatVenue) => void
}

function Bookings({
  go,
  session,
  savedVenueIds = [],
  allVenues = [],
  onSelectVenue,
  onToggleSave,
  onOpenChat,
}: BookingsProps) {
  const [bookings, setBookings] = useState<BackendBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'upcoming' | 'past' | 'saved' | 'cancelled'>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [receiptBooking, setReceiptBooking] = useState<BackendBooking | null>(null)
  const [messageBooking, setMessageBooking] = useState<BackendBooking | null>(null)
  const [chatText, setChatText] = useState('')
  const [chatSent, setChatSent] = useState(false)
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    setLoading(true); setError('')
    api.getMyBookings()
      .then(data => setBookings(data.bookings || []))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [session])

  if (!session) {
    return (
      <main className="dashboard">
        <div className="dashboard-head">
          <span className="eyebrow coral">YOUR CELEBRATIONS</span>
          <h1>My bookings & events</h1>
          <p>Sign in to view your celebrations, digital passes, and saved spaces.</p>
        </div>
        <Button onClick={() => go('auth')}>Sign in to view dashboard</Button>
      </main>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const upcomingList = bookings.filter(b => b.booking_date >= today && b.status !== 'cancelled')
  const pastList = bookings.filter(b => b.booking_date < today && b.status !== 'cancelled')
  const cancelledList = bookings.filter(b => b.status === 'cancelled')
  const savedVenues = allVenues.filter(v => savedVenueIds.includes(v.id))

  // Find nearest upcoming celebration
  const sortedUpcoming = [...upcomingList].sort((a, b) => a.booking_date.localeCompare(b.booking_date))
  const nextCelebration = sortedUpcoming[0]

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date(today).getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const handleCopyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref)
    setCopiedRef(ref)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  const filteredBookings = bookings.filter(b => {
    const venueName = (b.venues?.title || b.venues?.name || '').toLowerCase()
    const venueCity = (b.venues?.city || '').toLowerCase()
    const ref = `SS-${b.id.substring(0, 6).toUpperCase()}`.toLowerCase()
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query || venueName.includes(query) || venueCity.includes(query) || ref.includes(query)

    if (tab === 'upcoming') return b.booking_date >= today && b.status !== 'cancelled' && matchesSearch
    if (tab === 'past') return b.booking_date < today && b.status !== 'cancelled' && matchesSearch
    if (tab === 'cancelled') return b.status === 'cancelled' && matchesSearch
    return false
  })

  return (
    <main className="dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-head">
        <span className="eyebrow coral">YOUR CELEBRATIONS DASHBOARD</span>
        <h1>Celebration Central</h1>
        <p>Manage your upcoming events, digital entry passes, receipts, and saved dream venues.</p>
      </div>

      {/* Overview Metric Cards */}
      <div className="user-overview-strip">
        <div
          className="user-metric-card"
          onClick={() => setTab('upcoming')}
          style={{ cursor: 'pointer', border: tab === 'upcoming' ? '2px solid var(--coral)' : undefined }}
        >
          <div className="user-metric-icon">🎉</div>
          <div className="user-metric-info">
            <strong>{upcomingList.length}</strong>
            <span>Upcoming Celebrations</span>
          </div>
        </div>

        <div
          className="user-metric-card"
          onClick={() => setTab('past')}
          style={{ cursor: 'pointer', border: tab === 'past' ? '2px solid var(--coral)' : undefined }}
        >
          <div className="user-metric-icon">📜</div>
          <div className="user-metric-info">
            <strong>{pastList.length}</strong>
            <span>Completed Events</span>
          </div>
        </div>

        <div
          className="user-metric-card"
          onClick={() => setTab('saved')}
          style={{ cursor: 'pointer', border: tab === 'saved' ? '2px solid var(--coral)' : undefined }}
        >
          <div className="user-metric-icon">❤️</div>
          <div className="user-metric-info">
            <strong>{savedVenueIds.length}</strong>
            <span>Saved Spaces</span>
          </div>
        </div>

        <div className="user-metric-card">
          <div className="user-metric-icon" style={{ background: '#dcfce7', color: '#166534' }}>🛡️</div>
          <div className="user-metric-info">
            <strong style={{ fontSize: '18px', color: '#166534' }}>Active</strong>
            <span>Verified Organizer</span>
          </div>
        </div>
      </div>

      {/* Nearest Celebration Countdown Spotlight */}
      {nextCelebration && tab === 'upcoming' && (
        <section className="celebration-spotlight-card">
          <div className="spotlight-top-tag">✨ NEXT CELEBRATION SPOTLIGHT</div>
          <div className="spotlight-content">
            <div className="spotlight-info">
              <h2>{nextCelebration.venues?.title || nextCelebration.venues?.name || 'Upcoming Venue'}</h2>
              <p>
                📅 {nextCelebration.booking_date} · ⏰ {nextCelebration.start_time}–{nextCelebration.end_time}
                {nextCelebration.venues?.city ? ` · 📍 ${nextCelebration.venues.city}` : ''}
              </p>
              <div className="spotlight-countdown-strip">
                <div className="spotlight-count-box">
                  <strong>{getDaysUntil(nextCelebration.booking_date)}</strong>
                  <span>Days</span>
                </div>
                <div className="spotlight-count-box">
                  <strong>{Math.floor(Math.random() * 8) + 12}</strong>
                  <span>Hours</span>
                </div>
                <div className="spotlight-count-box">
                  <strong>30</strong>
                  <span>Mins</span>
                </div>
              </div>
            </div>
            <div className="spotlight-actions">
              <Button
                variant="secondary"
                style={{ background: '#ffffff', color: '#1f2433', border: 'none' }}
                onClick={() => setReceiptBooking(nextCelebration)}
              >
                🧾 Digital Pass
              </Button>
              <Button
                variant="secondary"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}
                onClick={() => {
                  const query = encodeURIComponent(`${nextCelebration.venues?.title || ''} ${nextCelebration.venues?.city || ''}`)
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
                }}
              >
                🗺️ Directions
              </Button>
              <Button
                style={{ background: 'var(--coral)', color: '#ffffff', border: 'none' }}
                onClick={() => {
                  if (onOpenChat && nextCelebration.venue_id) {
                    onOpenChat({
                      id: nextCelebration.venue_id,
                      title: nextCelebration.venues?.title || 'Celebration Venue',
                    })
                  } else {
                    setMessageBooking(nextCelebration)
                  }
                }}
              >
                💬 Message Host
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>
            Upcoming ({upcomingList.length})
          </button>
          <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>
            Past ({pastList.length})
          </button>
          <button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>
            Saved Spaces ({savedVenueIds.length})
          </button>
          <button className={tab === 'cancelled' ? 'active' : ''} onClick={() => setTab('cancelled')}>
            Cancelled ({cancelledList.length})
          </button>
        </div>

        {tab !== 'saved' && (
          <input
            type="text"
            className="dashboard-search-input"
            placeholder="🔍 Search bookings or Ref ID…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        )}
      </div>

      {loading && <p style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading your celebration records…</p>}
      {error && <p style={{ color: '#dc2626', padding: '16px', background: '#fef2f2', borderRadius: '8px', margin: '16px 0' }}>{error}</p>}

      {/* Saved Spaces Tab View */}
      {tab === 'saved' && (
        <div style={{ marginTop: 24 }}>
          {savedVenues.length === 0 ? (
            <section className="empty-card">
              <div>❤️</div>
              <h2>No saved venues yet</h2>
              <p>Explore venues and tap the heart icon to curate your shortlist of dream celebration spaces.</p>
              <Button variant="secondary" onClick={() => go('browse')}>Browse top venues</Button>
            </section>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {savedVenues.map(venue => {
                const img = venue.image || photos[0]
                return (
                  <div
                    key={venue.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 16,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ position: 'relative', height: 160 }}>
                      <img src={img} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => onToggleSave?.(venue.id)}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'rgba(255,255,255,0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 16,
                        }}
                        title="Remove from saved"
                      >
                        ❤️
                      </button>
                    </div>
                    <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#1f2433' }}>{venue.name}</h3>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>📍 {venue.place} · 👥 {venue.guests}</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--coral)', fontSize: 15 }}>
                          {venue.price}
                        </span>
                        <Button
                          variant="secondary"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={() => {
                            onSelectVenue?.(venue)
                            go('detail')
                          }}
                        >
                          View Details →
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bookings List View */}
      {tab !== 'saved' && !loading && filteredBookings.map(b => {
        const venueName = b.venues?.title || b.venues?.name || 'Venue'
        const venueCity = b.venues?.city || ''
        const matchedVenue = allVenues.find(v => v.id === b.venue_id)
        const venueImg = b.venues?.image_url || matchedVenue?.image || photos[0]
        const ref = `SS-${b.id.substring(0, 6).toUpperCase()}`
        const statusClass = b.status === 'confirmed' ? 'confirmed' : b.status === 'cancelled' ? 'cancelled' : ''
        const daysLeft = getDaysUntil(b.booking_date)

        return (
          <article className="booking-item" key={b.id} style={{ position: 'relative' }}>
            <img src={venueImg} alt={venueName} />
            <div className="booking-main" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span className={`status ${statusClass}`}>
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </span>
                {b.booking_date >= today && b.status !== 'cancelled' && (
                  <span className="booking-countdown-pill">
                    ⏳ {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyRef(ref)}
                  style={{
                    marginLeft: 'auto',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: 'pointer',
                    color: '#6b7280',
                  }}
                  title="Copy reference code"
                >
                  {copiedRef === ref ? '✓ Copied!' : `📋 ${ref}`}
                </button>
              </div>

              <h2>{venueName}</h2>
              <p>📅 {b.booking_date} · ⏰ {b.start_time}–{b.end_time}{venueCity ? ` · 📍 ${venueCity}` : ''}</p>

              <div className="booking-code" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>Total: <strong>{formatPrice(b.total_amount)}</strong> {b.payment_status === 'paid' ? '• Paid in full' : '• Payment pending'}</span>
                <span style={{ fontSize: 12, color: '#16a34a' }}>✓ Free host cancellation up to 48h prior</span>
              </div>

              <div className="booking-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (onOpenChat && b.venue_id) {
                      onOpenChat({
                        id: b.venue_id,
                        title: venueName,
                      })
                    } else {
                      setMessageBooking(b)
                    }
                  }}
                >
                  💬 Message host
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const query = encodeURIComponent(`${venueName} ${venueCity}`)
                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
                  }}
                >
                  🗺️ Directions
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setReceiptBooking(b)}
                  style={{ borderColor: 'var(--coral)', color: 'var(--coral)' }}
                >
                  🧾 Pass & Invoice
                </Button>
                {b.booking_date < today && matchedVenue && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onSelectVenue?.(matchedVenue)
                      go('detail')
                    }}
                  >
                    ⭐ Review space
                  </Button>
                )}
              </div>
            </div>
          </article>
        )
      })}

      {/* Empty State */}
      {tab !== 'saved' && !loading && !error && filteredBookings.length === 0 && (
        <section className="empty-card">
          <div>＋</div>
          <h2>
            {searchQuery
              ? `No bookings matching "${searchQuery}"`
              : tab === 'cancelled'
              ? 'No cancelled bookings'
              : tab === 'past'
              ? 'No past celebrations yet'
              : 'Planning a celebration?'}
          </h2>
          <p>
            {tab === 'upcoming'
              ? 'Explore verified farmhouses, banquets, and rooftops with clear pricing and thoughtful hosts.'
              : `You have no ${tab} bookings listed in this section.`}
          </p>
          {tab === 'upcoming' && <Button variant="secondary" onClick={() => go('browse')}>Find your venue</Button>}
        </section>
      )}

      {/* ─── Digital Entry Pass & Receipt Modal ─── */}
      {receiptBooking && (
        <div className="receipt-modal-overlay" onClick={() => setReceiptBooking(null)}>
          <div className="receipt-card" onClick={e => e.stopPropagation()}>
            <div className="receipt-header">
              <div className="receipt-header-brand">
                SPACESHARE <span>★ PASS</span>
              </div>
              <button
                onClick={() => setReceiptBooking(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="receipt-body">
              <div className="receipt-ticket-banner">
                <strong>✓ CONFIRMED RESERVATION</strong>
                <span>Ref: SS-{receiptBooking.id.substring(0, 6).toUpperCase()}</span>
              </div>

              <h2 style={{ fontSize: 20, margin: '0 0 6px', color: '#1f2433' }}>
                {receiptBooking.venues?.title || receiptBooking.venues?.name || 'Celebration Venue'}
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
                📍 {receiptBooking.venues?.address || 'Prime Location'}, {receiptBooking.venues?.city || 'India'}
              </p>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div className="receipt-row">
                  <span>Event Date</span>
                  <strong>{receiptBooking.booking_date}</strong>
                </div>
                <div className="receipt-row">
                  <span>Reserved Hours</span>
                  <strong>{receiptBooking.start_time} – {receiptBooking.end_time}</strong>
                </div>
                <div className="receipt-row">
                  <span>Guest Capacity</span>
                  <strong>Up to {receiptBooking.venues?.capacity || 150} attendees</strong>
                </div>
              </div>

              <div className="receipt-divider" />

              <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '0 0 10px' }}>
                Itemized Payment Breakdown
              </h3>
              <div className="receipt-row">
                <span>Base Venue Hire</span>
                <span>{formatPrice(receiptBooking.total_amount * 0.82)}</span>
              </div>
              <div className="receipt-row">
                <span>Sanitization & Power Backup</span>
                <span>₹2,500</span>
              </div>
              <div className="receipt-row">
                <span>SpaceShare Trust & Insurance Guarantee</span>
                <span>₹1,200</span>
              </div>
              <div className="receipt-row">
                <span>Goods & Services Tax (GST 18%)</span>
                <span>{formatPrice(receiptBooking.total_amount * 0.18)}</span>
              </div>
              <div className="receipt-row total-row">
                <span>Total Paid (INR)</span>
                <span style={{ color: 'var(--coral)' }}>{formatPrice(receiptBooking.total_amount)}</span>
              </div>

              <div className="receipt-barcode-box">
                <div className="receipt-fake-qr">|||||  |||  ||||  ||  |||||  |||</div>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                  Show this digital pass at the venue entrance. Verified by SpaceShare.
                </p>
              </div>
            </div>

            <div className="receipt-footer-actions">
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => window.print()}
              >
                🖨️ Print Pass
              </Button>
              <Button
                style={{ flex: 1 }}
                onClick={() => setReceiptBooking(null)}
              >
                Close Pass
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Message Host Modal ─── */}
      {messageBooking && (
        <div className="message-modal-overlay" onClick={() => setMessageBooking(null)}>
          <div className="message-modal-box" onClick={e => e.stopPropagation()}>
            <div className="message-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#1f2433' }}>
                  Message Venue Host
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                  {messageBooking.venues?.title || 'Venue'} · Booking SS-{messageBooking.id.substring(0, 6).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setMessageBooking(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}
              >
                ✕
              </button>
            </div>

            <div className="message-modal-body">
              <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 12px' }}>
                Quick organizer inquiries:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  'Can we arrange early decor access?',
                  'Confirming 100% generator power backup',
                  'Is outside catering permitted?',
                  'What is the sound limit & cutoff time?',
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    className="message-preset-chip"
                    onClick={() => setChatText(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                placeholder="Type your message or special requirement for the host…"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #d1d5db',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {chatSent && (
                <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: 8, marginTop: 12, fontSize: 13 }}>
                  ✓ Message delivered to host! They typically respond within 15 minutes.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <Button variant="secondary" onClick={() => setMessageBooking(null)}>Cancel</Button>
                <Button
                  disabled={!chatText.trim()}
                  onClick={() => {
                    setChatSent(true)
                    setTimeout(() => {
                      setChatSent(false)
                      setMessageBooking(null)
                      setChatText('')
                    }, 1800)
                  }}
                >
                  Send Message 🚀
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Page: Host ───────────────────────────────────────────────────────────────

// ── Shared step-indicator ────────────────────────────────────────────────────
const STEPS = ['About your space', 'Capacity & amenities', 'Photos & pricing', 'Verification']

function StepIndicator({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((label, i) => {
        const done = i < step
        const active = i === step
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, flexShrink: 0,
                background: done ? '#e07653' : active ? '#fff' : '#f3f4f6',
                border: active ? '2px solid #e07653' : done ? 'none' : '2px solid #e5e7eb',
                color: done ? '#fff' : active ? '#e07653' : '#9ca3af',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#e07653' : done ? '#374151' : '#9ca3af', whiteSpace: 'nowrap', textAlign: 'center', maxWidth: 72 }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#e07653' : '#e5e7eb', margin: '0 4px', marginBottom: 22 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Amenities available ──────────────────────────────────────────────────────
const AMENITY_OPTIONS = ['Parking', 'Catering', 'Air conditioning', 'DJ setup', 'Decor included', 'Generator backup', 'In-house staff', 'Garden area', 'Swimming pool', 'Bridal suite', 'Stage & lighting', 'Valet parking', 'CCTV security', 'Alcohol permitted', 'Outside caterer allowed']
const EVENT_TYPE_OPTIONS = ['Wedding', 'Corporate event', 'Birthday party', 'Reception', 'Baby shower', 'Product launch', 'Conference', 'Engagement', 'Anniversary', 'Photoshoot']

// ── Photo upload tile ────────────────────────────────────────────────────────
function PhotoTile({ file, onRemove, isPrimary, onSetPrimary }: { file: File; onRemove: () => void; isPrimary: boolean; onSetPrimary: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: isPrimary ? '2px solid #e07653' : '2px solid #e5e7eb', background: '#f9fafb' }}>
      <img src={url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
        <button type="button" onClick={onRemove} style={{ background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14 }}>×</button>
      </div>
      <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="radio" checked={isPrimary} onChange={onSetPrimary} id={`primary-${file.name}`} style={{ accentColor: '#e07653' }} />
        <label htmlFor={`primary-${file.name}`} style={{ fontSize: 11, color: '#374151', cursor: 'pointer' }}>{isPrimary ? '⭐ Cover photo' : 'Set as cover'}</label>
      </div>
    </div>
  )
}

// ── Document upload tile ─────────────────────────────────────────────────────
function DocTile({ file, label, onRemove }: { file: File; label: string; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/')
  const url = useMemo(() => URL.createObjectURL(file), [file])
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb' }}>
      {isImg
        ? <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
        : <div style={{ width: 48, height: 48, background: '#fff3ee', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📄</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <button type="button" onClick={onRemove} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: 4 }}>🗑</button>
    </div>
  )
}

function HostMyListings({
  session,
  go,
  onSelectVenue,
}: {
  session: Session
  go?: (p: Page) => void
  onSelectVenue?: (v: VenueCardData) => void
}) {
  const [venues, setVenues] = useState<BackendVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Interactive Earnings Calculator
  const [calcType, setCalcType] = useState('farmhouse')
  const [calcGuests, setCalcGuests] = useState(250)
  const [calcEventsPerMonth, setCalcEventsPerMonth] = useState(3)

  useEffect(() => {
    api.getMyVenues()
      .then(data => setVenues(data.venues || []))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [session])

  const verifiedCount = venues.filter(v => v.is_verified).length
  const totalRevenueEst = Math.max(
    75000,
    venues.reduce((sum, v) => sum + (v.price_per_day || 40000), 0) * 2.5
  )

  const estimatedDayRate = Math.round((calcGuests * 160 + (calcType === 'farmhouse' ? 22000 : calcType === 'banquet_hall' ? 32000 : 18000)) / 1000) * 1000
  const estimatedMonthly = estimatedDayRate * calcEventsPerMonth

  const handleShare = (id: string) => {
    const url = window.location.origin
    navigator.clipboard?.writeText(`${url}#venue-${id}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <p style={{ padding: '32px 0', color: '#6b7280' }}>Loading your listings…</p>
  if (error) return <p style={{ padding: '32px 0', color: '#dc2626' }}>⚠️ {error}</p>

  return (
    <div>
      {/* Host Metrics Bar */}
      <div className="host-dashboard-strip">
        <div className="host-stat-box">
          <div className="host-stat-box-icon">🏛️</div>
          <div>
            <strong>{venues.length}</strong>
            <span>Listed Properties</span>
          </div>
        </div>

        <div className="host-stat-box">
          <div className="host-stat-box-icon" style={{ background: '#dcfce7', color: '#166534' }}>🛡️</div>
          <div>
            <strong style={{ color: '#166534' }}>{verifiedCount}</strong>
            <span>Verified & Live</span>
          </div>
        </div>

        <div className="host-stat-box">
          <div className="host-stat-box-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>💰</div>
          <div>
            <strong>₹{totalRevenueEst.toLocaleString('en-IN')}</strong>
            <span>Est. Monthly Potential</span>
          </div>
        </div>

        <div className="host-stat-box">
          <div className="host-stat-box-icon" style={{ background: '#fef3c7', color: '#b45309' }}>★</div>
          <div>
            <strong>4.92 / 5.0</strong>
            <span>Host Quality Score</span>
          </div>
        </div>
      </div>

      {/* Interactive Host Earnings Estimator */}
      <div className="host-calculator-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="eyebrow coral">HOST PRICING SIMULATOR</span>
            <h3 style={{ margin: '6px 0 4px', fontSize: 18, color: '#1f2433' }}>
              Estimate your space earnings potential
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              See what hosts earn in top Indian metros based on venue capacity.
            </p>
          </div>
          <div style={{ textAlign: 'right', background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 14, padding: '12px 20px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Projected Monthly Income
            </span>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--coral)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              ₹{estimatedMonthly.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              ~₹{estimatedDayRate.toLocaleString('en-IN')} per celebration
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 6 }}>
              Space Type
            </label>
            <select
              value={calcType}
              onChange={e => setCalcType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 13, background: '#fff' }}
            >
              <option value="farmhouse">Farmhouse & Lawn</option>
              <option value="banquet_hall">Banquet Hall</option>
              <option value="rooftop_terrace">Rooftop Terrace</option>
              <option value="resort">Villa / Resort</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 6 }}>
              Guest Capacity: {calcGuests} guests
            </label>
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={calcGuests}
              onChange={e => setCalcGuests(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--coral)', marginTop: 8 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 6 }}>
              Celebrations / Month: {calcEventsPerMonth}
            </label>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={calcEventsPerMonth}
              onChange={e => setCalcEventsPerMonth(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--coral)', marginTop: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Listings List */}
      {venues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f9fafb', borderRadius: '16px', border: '1px dashed #d1d5db' }}>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>You haven't listed any spaces yet.</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Use the "+ List new space" tab to submit your first venue and start receiving inquiries.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {venues.map(v => (
            <div
              key={v.id}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '22px 26px',
                display: 'flex',
                gap: '22px',
                alignItems: 'flex-start',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              {/* Thumbnail */}
              {v.venue_images && v.venue_images.length > 0 ? (
                <img
                  src={(v.venue_images.find(i => i.is_primary) || v.venue_images[0]).image_url}
                  alt={v.title}
                  style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '100px', height: '80px', background: '#f3f4f6', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏛️</div>
              )}

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>{v.title}</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#6b7280' }}>
                      📍 {v.city}{v.state ? `, ${v.state}` : ''} {v.address ? `· ${v.address}` : ''}
                    </p>
                  </div>

                  {/* Verification badge */}
                  <span style={{
                    padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                    background: v.is_verified ? '#dcfce7' : '#fef3c7',
                    color: v.is_verified ? '#15803d' : '#92400e',
                    flexShrink: 0,
                  }}>
                    {v.is_verified ? '✓ Verified & Live' : '⏳ Under verification'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {v.capacity && <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>👥 Up to {v.capacity} guests</span>}
                  {v.price_per_day && (
                    <span style={{ fontSize: '13px', color: 'var(--coral)', fontWeight: 700 }}>
                      ₹{v.price_per_day.toLocaleString('en-IN')} / day
                    </span>
                  )}
                  {v.price_per_hour && <span style={{ fontSize: '13px', color: '#4b5563' }}>₹{v.price_per_hour.toLocaleString('en-IN')} / hr</span>}
                  <span style={{ fontSize: '12px', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 6 }}>
                    ⚡ Instant booking enabled
                  </span>
                </div>

                {!v.is_verified && (
                  <p style={{ margin: '12px 0 0', fontSize: '12.5px', color: '#78716c', background: '#fef9f0', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    ℹ️ Your listing and identity documents are under review by the SpaceShare verification team. We approve listings within 24–48 hours.
                  </p>
                )}

                {/* Quick Action Toolbar */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  {onSelectVenue && go && (
                    <Button
                      variant="secondary"
                      style={{ padding: '6px 14px', fontSize: 12 }}
                      onClick={() => {
                        onSelectVenue(mapVenue(v, 0))
                        go('detail')
                      }}
                    >
                      👁️ Preview Public Page
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    style={{ padding: '6px 14px', fontSize: 12 }}
                    onClick={() => handleShare(v.id)}
                  >
                    {copiedId === v.id ? '✓ Link Copied!' : '📋 Share Listing'}
                  </Button>
                  <Button
                    variant="secondary"
                    style={{ padding: '6px 14px', fontSize: 12, color: '#4b5563' }}
                    onClick={() => alert(`Calendar & availability management for ${v.title} opened.`)}
                  >
                    🗓️ Manage Dates
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Host({
  go,
  session,
  onSelectVenue,
  onOpenChat,
}: {
  go: (p: Page) => void
  session: Session | null
  onSelectVenue?: (v: VenueCardData) => void
  onOpenChat?: (v: ActiveChatVenue) => void
}) {
  const [tab, setTab] = useState<'list' | 'my-listings' | 'received-bookings'>('list')
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  // Step 1
  const [venueName, setVenueName] = useState('')
  const [venueType, setVenueType] = useState('other')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [venueState, setVenueState] = useState('')
  const [description, setDescription] = useState('')
  // Step 2
  const [capacity, setCapacity] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [rules, setRules] = useState('')
  // Step 3
  const [venuePhotos, setVenuePhotos] = useState<File[]>([])
  const [primaryIdx, setPrimaryIdx] = useState(0)
  const [priceDay, setPriceDay] = useState('')
  const [priceHour, setPriceHour] = useState('')
  // Step 4
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [idType, setIdType] = useState('Aadhaar card')
  const [idProof, setIdProof] = useState<File | null>(null)
  const [addressProof, setAddressProof] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)

  const AMENITY_LIST = ['Parking','Catering','Air conditioning','DJ setup','Decor included','Generator backup','In-house staff','Garden area','Swimming pool','Bridal suite','Stage & lighting','Valet parking','CCTV security','Alcohol permitted','Outside caterer allowed']
  const EVENT_LIST   = ['Wedding','Corporate event','Birthday party','Reception','Baby shower','Product launch','Conference','Engagement','Anniversary','Photoshoot']

  const resetAll = () => {
    setStep(0); setSubmitted(false); setError('')
    setVenueName(''); setVenueType('other'); setAddress(''); setCity(''); setVenueState(''); setDescription('')
    setCapacity(''); setSelectedAmenities([]); setSelectedEventTypes([]); setRules('')
    setVenuePhotos([]); setPrimaryIdx(0); setPriceDay(''); setPriceHour('')
    setOwnerName(''); setOwnerPhone(''); setOwnerEmail(''); setIdType('Aadhaar card')
    setIdProof(null); setAddressProof(null); setConsent(false)
  }

  const toggleAmenity = (a: string) =>
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  const toggleEventType = (t: string) =>
    setSelectedEventTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    setVenuePhotos(prev => [...prev, ...imgs].slice(0, 10))
  }

  const validateStep = (): string => {
    if (step === 0) {
      if (!venueName.trim()) return 'Venue name is required.'
      if (!address.trim()) return 'Address is required.'
      if (!city.trim()) return 'City is required.'
    }
    if (step === 1 && (!capacity || isNaN(Number(capacity)))) return 'Please enter a valid guest capacity.'
    if (step === 2 && !priceDay.trim() && !priceHour.trim()) return 'Enter at least a day price or hourly rate.'
    if (step === 3) {
      if (!ownerName.trim()) return 'Owner full name is required.'
      if (!ownerPhone.trim()) return 'Mobile number is required.'
      if (!idProof) return 'Please upload your ID proof document.'
      if (!consent) return 'Please accept the declaration to continue.'
    }
    return ''
  }

  const handleNext = (e: FormEvent) => {
    e.preventDefault()
    const err = validateStep()
    if (err) { setError(err); return }
    setError(''); setStep(s => s + 1)
  }
  const handleBack = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const err = validateStep()
    if (err) { setError(err); return }
    setSubmitting(true); setError('')
    try {
      const venueResult = await api.createVenue({
        title: venueName, description, address, city,
        state: venueState,
        capacity: capacity ? Number(capacity) : undefined,
        price_per_day: priceDay ? Number(priceDay) : undefined,
        price_per_hour: priceHour ? Number(priceHour) : undefined,
        amenities: selectedAmenities,
        venue_type: venueType,
        rules,
      })
      const venueId = venueResult.venue.id
      for (let i = 0; i < venuePhotos.length; i++) {
        try { await api.uploadVenueImage(venueId, venuePhotos[i], i === primaryIdx) } catch { /* non-fatal */ }
      }
      try {
        await api.submitVerification({
          venue_id: venueId,
          id_proof: idProof ?? undefined,
          address_proof: addressProof ?? undefined,
        })
      } catch { /* non-fatal */ }
      setSubmitted(true)
    } catch (err: unknown) {
      setError((err as Error).message || 'Submission failed. Please try again.')
    } finally { setSubmitting(false) }
  }

  if (!session) return (
    <main className="host-page">
      <div style={{ maxWidth: 960, margin: '20px auto 0', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => go('home')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--white)',
            border: '1.5px solid var(--line)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(31,36,51,0.04)',
          }}
        >
          <span>🏠</span>
          <span>← Back to Home Dashboard</span>
        </button>
      </div>
      <div className="host-hero">
        <div><span className="eyebrow">BECOME A SPACESHARE HOST</span>
          <h1>Your space has a story.<br />Let celebrations become part of it.</h1>
          <p>Join trusted venue owners across India. Sign in to list your space and start earning.</p>
        </div>
        <div className="host-stat"><strong>₹68k</strong><span>average monthly host earnings</span></div>
      </div>
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <Button onClick={() => go('auth')}>Sign in to list your space</Button>
      </div>
    </main>
  )

  if (submitted) return (
    <main className="host-page">
      <div style={{ maxWidth: 960, margin: '20px auto 0', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => go('home')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--white)',
            border: '1.5px solid var(--line)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(31,36,51,0.04)',
          }}
        >
          <span>🏠</span>
          <span>← Back to Home Dashboard</span>
        </button>
      </div>
      <div className="host-hero">
        <div><span className="eyebrow">BECOME A SPACESHARE HOST</span>
          <h1>Your space is in good hands.</h1>
        </div>
        <div className="host-stat"><strong>₹68k</strong><span>average monthly host earnings</span></div>
      </div>
      <div style={{ maxWidth: 560, margin: '48px auto', background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: '44px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <span className="eyebrow coral">SUBMITTED FOR REVIEW</span>
        <h2 style={{ margin: '14px 0 10px' }}>Listing received!</h2>
        <p style={{ color: '#6b7280', marginBottom: 28 }}>Our team will verify your listing and documents within 2–3 business days. We'll email you once approved.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => { resetAll(); setTab('my-listings') }}>View my listings</Button>
          <Button variant="secondary" onClick={resetAll}>List another space</Button>
        </div>
      </div>
    </main>
  )

  const stepForms = [
    /* ── STEP 1: About your space ── */
    <form key="s1" onSubmit={handleNext} className="host-form">
      <span className="eyebrow coral">STEP 1 OF 4</span>
      <h2>Tell us about your space</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Start with the basics — name, type, and location.</p>
      <Input label="Venue name *" placeholder="e.g. The Marigold Courtyard" value={venueName} onChange={e => setVenueName(e.target.value)} />
      <label className="field"><span>Venue type</span>
        <select value={venueType} onChange={e => setVenueType(e.target.value)}>
          <option value="other">Select type</option>
          {[
            { value: 'farmhouse', label: 'Farmhouse' },
            { value: 'banquet_hall', label: 'Banquet hall' },
            { value: 'rooftop_terrace', label: 'Rooftop terrace' },
            { value: 'open_lawn', label: 'Open lawn' },
            { value: 'heritage_haveli', label: 'Heritage / Haveli' },
            { value: 'resort', label: 'Resort' },
            { value: 'garden_outdoor', label: 'Garden / Outdoor' },
            { value: 'conference_hall', label: 'Conference hall' },
            { value: 'studio_space', label: 'Studio space' },
            { value: 'other', label: 'Other' },
          ].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <Input label="Full address *" placeholder="Street, locality, landmark" value={address} onChange={e => setAddress(e.target.value)} />
      <div className="date-grid">
        <Input label="City *" placeholder="e.g. New Delhi" value={city} onChange={e => setCity(e.target.value)} />
        <Input label="State" placeholder="e.g. Delhi" value={venueState} onChange={e => setVenueState(e.target.value)} />
      </div>
      <label className="field"><span>What makes it special?</span>
        <textarea rows={4} placeholder="Describe the atmosphere, unique features and best events for your space..." value={description} onChange={e => setDescription(e.target.value)} />
      </label>
      {error && <p style={{ color: '#dc2626', fontSize: 13, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, marginBottom: 8 }}>⚠️ {error}</p>}
      <div className="form-actions"><Button type="submit">Next: Capacity & amenities →</Button></div>
    </form>,

    /* ── STEP 2: Capacity & amenities ── */
    <form key="s2" onSubmit={handleNext} className="host-form">
      <span className="eyebrow coral">STEP 2 OF 4</span>
      <h2>Capacity & amenities</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Help guests know how many can attend and what's included.</p>
      <div className="date-grid">
        <Input label="Maximum guest capacity *" placeholder="e.g. 250" value={capacity} onChange={e => setCapacity(e.target.value)} />
        <div />
      </div>
      <label className="field" style={{ marginBottom: 8 }}><span>Event types supported</span></label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {EVENT_LIST.map(t => (
          <button key={t} type="button" onClick={() => toggleEventType(t)} style={{ padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', borderColor: selectedEventTypes.includes(t) ? '#e07653' : '#e5e7eb', background: selectedEventTypes.includes(t) ? '#fff3ee' : '#fff', color: selectedEventTypes.includes(t) ? '#e07653' : '#374151' }}>
            {selectedEventTypes.includes(t) ? '✓ ' : ''}{t}
          </button>
        ))}
      </div>
      <label className="field" style={{ marginBottom: 8 }}><span>Amenities & facilities</span></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 10, marginBottom: 20 }}>
        {AMENITY_LIST.map(a => (
          <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px solid', borderColor: selectedAmenities.includes(a) ? '#e07653' : '#e5e7eb', background: selectedAmenities.includes(a) ? '#fff3ee' : '#fff', cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={selectedAmenities.includes(a)} onChange={() => toggleAmenity(a)} style={{ accentColor: '#e07653', width: 16, height: 16 }} />{a}
          </label>
        ))}
      </div>
      <label className="field"><span>House rules (optional)</span>
        <textarea rows={3} placeholder="e.g. No outside alcohol. Music stops by 11 PM." value={rules} onChange={e => setRules(e.target.value)} />
      </label>
      {error && <p style={{ color: '#dc2626', fontSize: 13, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, marginBottom: 8 }}>⚠️ {error}</p>}
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <Button type="button" variant="secondary" onClick={handleBack}>← Back</Button>
        <Button type="submit">Next: Photos & pricing →</Button>
      </div>
    </form>,

    /* ── STEP 3: Photos & pricing ── */
    <form key="s3" onSubmit={handleNext} className="host-form">
      <span className="eyebrow coral">STEP 3 OF 4</span>
      <h2>Photos & pricing</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Great photos increase bookings by 3×. Upload up to 10 photos.</p>
      <label style={{ display: 'block', border: '2px dashed #e07653', borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#fffaf8', marginBottom: 16 }}>
        <input type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} style={{ display: 'none' }} />
        <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
        <p style={{ margin: 0, fontWeight: 700, color: '#e07653' }}>Click to upload venue photos</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>JPEG, PNG, WEBP · Max 10MB each · Up to 10 photos</p>
      </label>
      {venuePhotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
          {venuePhotos.map((f, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: i === primaryIdx ? '2px solid #e07653' : '2px solid #e5e7eb' }}>
              <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => { setVenuePhotos(prev => prev.filter((_, j) => j !== i)); if (primaryIdx >= i) setPrimaryIdx(Math.max(0, primaryIdx - 1)) }} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
              <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 5, background: '#fff' }}>
                <input type="radio" checked={i === primaryIdx} onChange={() => setPrimaryIdx(i)} style={{ accentColor: '#e07653' }} />
                <span style={{ fontSize: 11, color: '#374151' }}>{i === primaryIdx ? '⭐ Cover' : 'Set cover'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 22, marginTop: 8 }}>
        <h3 style={{ fontSize: 17, margin: '0 0 14px' }}>Set your pricing</h3>
        <div className="date-grid">
          <div>
            <Input label="Day hire price (₹) *" placeholder="e.g. 45,000" value={priceDay} onChange={e => setPriceDay(e.target.value)} />
            <p style={{ fontSize: 12, color: '#6b7280', margin: '-6px 0 12px 2px' }}>Full day booking rate</p>
          </div>
          <div>
            <Input label="Hourly rate (₹)" placeholder="e.g. 5,000" value={priceHour} onChange={e => setPriceHour(e.target.value)} />
            <p style={{ fontSize: 12, color: '#6b7280', margin: '-6px 0 12px 2px' }}>Optional, for shorter events</p>
          </div>
        </div>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: 13, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, marginBottom: 8 }}>⚠️ {error}</p>}
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <Button type="button" variant="secondary" onClick={handleBack}>← Back</Button>
        <Button type="submit">Next: Verification →</Button>
      </div>
    </form>,

    /* ── STEP 4: Verification ── */
    <form key="s4" onSubmit={handleSubmit} className="host-form">
      <span className="eyebrow coral">STEP 4 OF 4</span>
      <h2>Owner & verification</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>We verify all hosts to keep SpaceShare safe. Documents are encrypted and never shared publicly.</p>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 18px 6px', marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 12px', color: '#374151' }}>👤 Owner details</h3>
        <Input label="Full name (as on ID) *" placeholder="e.g. Rahul Sharma" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
        <div className="date-grid">
          <Input label="Mobile number *" placeholder="+91 98765 43210" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
          <Input label="Email address" placeholder="you@example.com" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} />
        </div>
      </div>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 18px 14px', marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 12px', color: '#374151' }}>🧑 ID proof *</h3>
        <label className="field"><span>Document type</span>
          <select value={idType} onChange={e => setIdType(e.target.value)}>
            {['Aadhaar card','PAN card','Passport','Voter ID','Driving licence'].map(d => <option key={d}>{d}</option>)}
          </select>
        </label>
        {idProof ? (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
           <span style={{ fontSize: 26 }}>{idProof.type.startsWith('image/') ? '🖼️' : '📄'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{idType}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{idProof.name} · {(idProof.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => setIdProof(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 20, lineHeight: 1 }}>🗑</button>
          </div>
        ) : (
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, border: '2px dashed #d1d5db', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', background: '#fff' }}>
            <input type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && setIdProof(e.target.files[0])} style={{ display: 'none' }} />
            <span style={{ fontSize: 28 }}>📁</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#374151' }}>Upload {idType}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>JPEG, PNG or PDF · Max 10MB</p>
            </div>
          </label>
        )}
      </div>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 18px 14px', marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 4px', color: '#374151' }}>🏠 Address / property proof <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 13 }}>(optional)</span></h3>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Utility bill, property tax receipt, or any document linking you to this venue's address.</p>
        {addressProof ? (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
            <span style={{ fontSize: 26 }}>{addressProof.type.startsWith('image/') ? '🖼️' : 'uiop[]📄'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>Address proof</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{addressProof.name} · {(addressProof.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => setAddressProof(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 20, lineHeight: 1 }}>🗑</button>
          </div>
        ) : (
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, border: '2px dashed #d1d5db', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', background: '#fff' }}>
            <input type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && setAddressProof(e.target.files[0])} style={{ display: 'none' }} />
            <span style={{ fontSize: 28 }}>📋</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#374151' }}>Upload address proof</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>JPEG, PNG or PDF · Max 10MB</p>
            </div>
          </label>
        )}
      </div>
      <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, cursor: 'pointer', marginBottom: 20 }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, accentColor: '#e07653', width: 16, height: 16, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>I declare that I am the lawful owner or authorised representative of this property, all details are accurate, and I agree to SpaceShare's <strong>Host terms & conditions</strong> and <strong>Privacy policy</strong>.</span>
      </label>
      {error && <p style={{ color: '#dc2626', fontSize: 13, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, marginBottom: 8 }}>⚠️ {error}</p>}
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <Button type="button" variant="secondary" onClick={handleBack}>← Back</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit for verification'}</Button>
      </div>
    </form>,
  ]

  return (
    <main className="host-page">
      {/* Return to Home Dashboard Navigation Bar */}
      <div style={{ maxWidth: 960, margin: '24px auto -12px', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={() => go('home')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--white)',
            border: '1.5px solid var(--line)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(31,36,51,0.04)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--coral)'
            e.currentTarget.style.color = 'var(--coral)'
            e.currentTarget.style.transform = 'translateX(-3px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--line)'
            e.currentTarget.style.color = 'var(--ink)'
            e.currentTarget.style.transform = 'translateX(0)'
          }}
        >
          <span>🏠</span>
          <span>← Back to Home Dashboard</span>
        </button>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
          <span style={{ cursor: 'pointer', color: 'var(--coral)', fontWeight: 600 }} onClick={() => go('home')}>Home</span> / Host Portal
        </span>
      </div>

      <div className="host-hero">
        <div><span className="eyebrow">BECOME A SPACESHARE HOST</span>
          <h1>Your space has a story.<br />Let celebrations become part of it.</h1>
          <p>Join trusted venue owners across India. You set the price — we handle discovery, payments & support.</p>
        </div>
        <div className="host-stat"><strong>₹68k</strong><span>average monthly host earnings</span></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', maxWidth: 960, margin: '0 auto', padding: '0 24px', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex' }}>
          {(['list', 'my-listings', 'received-bookings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', borderBottom: tab === t ? '2px solid #e07653' : '2px solid transparent', color: tab === t ? '#e07653' : '#6b7280', marginBottom: -2 }}>
              {t === 'list' ? '+ List new space' : t === 'my-listings' ? 'My listings' : '📥 Received bookings'}
            </button>
          ))}
        </div>
        <button
          onClick={() => go('home')}
          style={{
            border: 'none',
            background: 'none',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--coral)',
            cursor: 'pointer',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.textDecoration = 'underline'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.textDecoration = 'none'
          }}
        >
          <span>🏠 Return to Homepage →</span>
        </button>
      </div>
      {tab === 'received-bookings' ? (
        <HostReceivedBookings session={session} go={go} onOpenChat={onOpenChat} />
      ) : tab === 'my-listings' ? (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>My property listings</h2>
          <HostMyListings session={session} go={go} onSelectVenue={onSelectVenue} />
        </div>
      ) : (
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, padding: '40px 24px 80px' }}>
          <aside style={{ alignSelf: 'start', position: 'sticky', top: 100 }}>
            {STEPS.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 24, paddingLeft: 20, borderLeft: i < STEPS.length - 1 ? `2px solid ${i < step ? '#e07653' : '#e5e7eb'}` : 'none', marginLeft: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -12, top: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: i < step ? '#e07653' : i === step ? '#fff' : '#f3f4f6', border: i === step ? '2px solid #e07653' : 'none', color: i < step ? '#fff' : i === step ? '#e07653' : '#9ca3af' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ paddingTop: 2 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: i === step ? 700 : 500, color: i === step ? '#111827' : i < step ? '#374151' : '#9ca3af' }}>{label}</p>
                  {i === step && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#e07653', fontWeight: 700, letterSpacing: '0.05em' }}>CURRENT</p>}
                </div>
              </div>
            ))}
          </aside>
          <div>
            <StepIndicator step={step} />
            {stepForms[step]}
          </div>
        </div>
      )}
    </main>
  )
}

function Admin({ session }: { session: Session | null }) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [verifications, setVerifications] = useState<AdminVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchVerifications = useCallback(async (status: string) => {
    setLoading(true); setError('')
    try {
      const data = await api.getVerifications(status)
      setVerifications(data.verifications || [])
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchVerifications(tab) }, [tab, fetchVerifications])

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await api.reviewVerification(id, 'approve')
      setVerifications(prev => prev.filter(v => v.id !== id))
    } catch (err: unknown) { setError((err as Error).message) }
    finally { setActionLoading(null) }
  }

  const handleReject = async () => {
    if (!rejectId) return
    setActionLoading(rejectId)
    try {
      await api.reviewVerification(rejectId, 'reject', rejectReason || 'Does not meet requirements')
      setVerifications(prev => prev.filter(v => v.id !== rejectId))
      setRejectId(null); setRejectReason('')
    } catch (err: unknown) { setError((err as Error).message) }
    finally { setActionLoading(null) }
  }

  if (!session) return (
    <main style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <h2>Admin access required</h2>
      <p style={{ color: '#6b7280' }}>Please sign in with an admin account to access the verification panel.</p>
    </main>
  )

  const pendingCount = tab === 'pending' ? verifications.length : '…'

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '40px 0 24px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="eyebrow coral">ADMIN PANEL</span>
          <h1 style={{ margin: '8px 0 6px', fontSize: 28 }}>Venue verification</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>Review host identity and venue details before publishing.</p>
        </div>
        <div style={{ background: '#fff3ee', borderRadius: 14, padding: '14px 24px', textAlign: 'center' }}>
          <strong style={{ fontSize: 28, color: '#e07653', display: 'block' }}>{pendingCount}</strong>
          <span style={{ fontSize: 12, color: '#78716c' }}>awaiting review</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 28 }}>
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 24px', fontSize: 14, fontWeight: 600, border: 'none', background: 'none',
            cursor: 'pointer', borderBottom: tab === t ? '2px solid #e07653' : '2px solid transparent',
            color: tab === t ? '#e07653' : '#6b7280', marginBottom: -2, textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <p style={{ color: '#dc2626', fontSize: 13, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, marginBottom: 16 }}>⚠️ {error}</p>}

      {/* Loading */}
      {loading && <p style={{ color: '#6b7280', padding: '32px 0', textAlign: 'center' }}>Loading verifications…</p>}

      {/* Empty */}
      {!loading && verifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>{tab === 'approved' ? '✅' : tab === 'rejected' ? '❌' : '📋'}</p>
          <p style={{ fontSize: 16, color: '#6b7280' }}>No {tab} verifications found.</p>
        </div>
      )}

      {/* Verification cards */}
      {!loading && verifications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {verifications.map(v => {
            const venue = v.venues
            const owner = v.venues?.profiles
            const isExpanded = expandedId === v.id
            return (
              <div key={v.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                {/* Summary row */}
                <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}
                     onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                  {/* Venue thumbnail */}
                  {venue?.venue_images && venue.venue_images.length > 0 ? (
                    <img src={(venue.venue_images.find(i => i.is_primary) || venue.venue_images[0]).image_url}
                         alt="" style={{ width: 64, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 64, height: 52, background: '#f3f4f6', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏛️</div>
                  )}
                  {/* Venue + owner info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>{venue?.title || 'Unnamed venue'}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{venue?.city}{venue?.state ? `, ${venue.state}` : ''}</p>
                  </div>
                  <div style={{ minWidth: 140 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>👤 {owner?.full_name || 'Unknown'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{owner?.email || ''}</p>
                  </div>
                  <div style={{ minWidth: 90 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Submitted</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500, color: '#374151' }}>{formatDate(v.created_at)}</p>
                  </div>
                  {/* Status badge */}
                  <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, flexShrink: 0,
                    background: v.status === 'approved' ? '#dcfce7' : v.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                    color: v.status === 'approved' ? '#15803d' : v.status === 'rejected' ? '#b91c1c' : '#92400e',
                  }}>
                    {v.status === 'approved' ? '✓ Approved' : v.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                  </span>
                  {/* Expand arrow */}
                  <span style={{ fontSize: 18, color: '#9ca3af', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '20px 24px', background: '#fafafa' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                      {/* Venue details */}
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Venue details</h4>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>Name:</strong> {venue?.title}</p>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>Address:</strong> {venue?.address}</p>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>City:</strong> {venue?.city}, {venue?.state}</p>
                        {venue?.capacity && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>Capacity:</strong> {venue.capacity} guests</p>}
                        {venue?.price_per_day && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>Day price:</strong> ₹{venue.price_per_day.toLocaleString('en-IN')}</p>}
                        {venue?.description && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{venue.description}</p>}
                      </div>
                      {/* Owner details */}
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Owner details</h4>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>Name:</strong> {owner?.full_name || '—'}</p>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>Email:</strong> {owner?.email || '—'}</p>
                        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>Phone:</strong> {owner?.phone || '—'}</p>
                        {v.admin_notes && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}><strong>Notes:</strong> {v.admin_notes}</p>}
                      </div>
                      {/* Documents */}
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Documents</h4>
                        {v.id_proof_url ? (
                          <a href={v.id_proof_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#e07653', fontWeight: 600, textDecoration: 'none', marginBottom: 8 }}>
                            📄 View ID proof
                          </a>
                        ) : <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af' }}>No ID proof uploaded</p>}
                        <br />
                        {v.address_proof_url ? (
                          <a href={v.address_proof_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#e07653', fontWeight: 600, textDecoration: 'none' }}>
                            📋 View address proof
                          </a>
                        ) : <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af' }}>No address proof uploaded</p>}
                      </div>
                    </div>
                    {/* Rejection reason (if rejected) */}
                    {v.status === 'rejected' && v.admin_notes && (
                      <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}><strong>Rejection reason:</strong> {v.admin_notes}</p>
                      </div>
                    )}
                    {v.status === 'approved' && v.reviewed_at && (
                      <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>✓ Approved on {formatDate(v.reviewed_at)}</p>
                      </div>
                    )}
                    {/* Action buttons for pending */}
                    {v.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                        <Button onClick={() => handleApprove(v.id)} disabled={actionLoading === v.id}>
                          {actionLoading === v.id ? 'Processing…' : '✓ Approve venue'}
                        </Button>
                        <Button variant="secondary" onClick={() => { setRejectId(v.id); setRejectReason('') }} disabled={actionLoading === v.id}>
                          ✗ Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}
             onClick={() => setRejectId(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 460, width: '100%' }}
               onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Reject verification</h3>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>Provide a reason so the host can address the issue and resubmit.</p>
            <label className="field"><span>Rejection reason *</span>
              <textarea rows={3} placeholder="e.g. ID photo is blurred, document expired, venue address does not match…"
                        value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }} />
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setRejectId(null)}>Cancel</Button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading === rejectId}
                      style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                {actionLoading === rejectId ? 'Rejecting…' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Page: Auth ───────────────────────────────────────────────────────────────

function Auth({ go }: { go: (p: Page) => void }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'renter' | 'owner'>('renter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuth = async () => {
    setLoading(true); setError('')
    try {
      if (isSignup) {
        const data = await api.signup(email, password, fullName, role)
        if (data.session) {
          await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
        }
        go('home')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        go('home')
      }
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google' })
      if (oauthError) throw oauthError
    } catch (err: unknown) { setError((err as Error).message) }
  }

  return (
    <main className="auth-page">
      <div className="auth-visual">
        <img src={photos[4]} alt="Beautiful celebration venue" />
        <div><span className="eyebrow">MAKE ROOM FOR JOY</span><blockquote>"The right space changes the way a moment feels."</blockquote></div>
      </div>
      <div className="auth-panel">
        <Logo go={go} />
        <div className="auth-box">
          <span className="eyebrow coral">{isSignup ? 'JOIN SPACESHARE' : 'WELCOME BACK'}</span>
          <h1>{isSignup ? 'Create your account' : 'Good to see you again.'}</h1>
          <p>{isSignup ? 'Start discovering spaces made for celebrating.' : 'Sign in to manage your bookings and saved spaces.'}</p>
          {error && <p style={{ color: 'red', fontSize: '14px', margin: '5px 0' }}>{error}</p>}
          {isSignup && (
            <>
              <Input label="Full name" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} />
              <label className="field"><span>I am a</span>
                <select value={role} onChange={e => setRole(e.target.value as 'renter' | 'owner')}>
                  <option value="renter">Renter (looking for venues)</option>
                  <option value="owner">Owner (listing my space)</option>
                </select>
              </label>
            </>
          )}
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
          <Button className="wide" onClick={handleAuth} disabled={loading}>{loading ? 'Processing…' : isSignup ? 'Create account' : 'Sign in'}</Button>
          <div className="divider">or continue with</div>
          <Button variant="secondary" className="wide" onClick={handleGoogleLogin}>Continue with Google</Button>
          <p className="switch">{isSignup ? 'Already have an account?' : 'New to SpaceShare?'}{' '}<button onClick={() => setIsSignup(!isSignup)}>{isSignup ? 'Sign in' : 'Create account'}</button></p>
        </div>
      </div>
    </main>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const initial = (location.hash.replace('#', '') || 'home') as Page
  const [page, setPage] = useState<Page>(initial)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRoleState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('spaceshare_user_role')
      if (saved) return saved
      const hash = location.hash.replace('#', '')
      if (hash === 'host' || hash === 'owner-bookings') return 'owner'
      return 'owner'
    } catch {
      return 'owner'
    }
  })

  const setUserRole = useCallback((role: string) => {
    setUserRoleState(role)
    try { localStorage.setItem('spaceshare_user_role', role) } catch {}
  }, [])
  const [venuesList, setVenuesList] = useState<VenueCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<VenueCardData | null>(null)
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null)
  const [browseCity, setBrowseCity] = useState('All India')
  const [savedVenueIds, setSavedVenueIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('spaceshare_saved_venues')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const toggleSaveVenue = useCallback((id: string) => {
    setSavedVenueIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try { localStorage.setItem('spaceshare_saved_venues', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // ─── Messaging & Real-Time Notifications State ─────────────────────────────
  const [notifications, setNotifications] = useState<BackendNotification[]>([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [activeChatVenue, setActiveChatVenue] = useState<ActiveChatVenue | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [toastNotif, setToastNotif] = useState<BackendNotification | null>(null)
  const [homeTab, setHomeTab] = useState<'venues' | 'notifications'>('venues')

  const fetchNotifications = useCallback(() => {
    api.getNotifications()
      .then(res => {
        setNotifications(res.notifications || [])
        setUnreadNotifCount(res.unread_count || 0)
      })
      .catch(err => {
        console.warn('Could not fetch notifications from backend:', err)
      })
  }, [])

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 12000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  const handleOpenChat = useCallback((venue: ActiveChatVenue) => {
    setActiveChatVenue(venue)
    setIsChatOpen(true)
  }, [])

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false)
  }, [])

  const handleMarkNotifRead = useCallback((id: string) => {
    api.markNotificationRead(id)
      .then(res => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadNotifCount(res.unread_count)
      })
      .catch(() => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadNotifCount(c => Math.max(0, c - 1))
      })
  }, [])

  const handleMarkAllNotifsRead = useCallback(() => {
    api.markAllNotificationsRead()
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadNotifCount(0)
      })
      .catch(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadNotifCount(0)
      })
  }, [])

  const handleNewNotification = useCallback((notif: BackendNotification) => {
    setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id)])
    setUnreadNotifCount(c => c + 1)
    setToastNotif(notif)
    setTimeout(() => {
      setToastNotif(prev => prev?.id === notif.id ? null : prev)
    }, 6500)
  }, [])

  // If role changes and we're on admin page but not admin, redirect
  const isAdmin = userRole === 'admin'
  useEffect(() => {
    if (page === 'admin' && !isAdmin) {
      setPage('home')
      location.hash = 'home'
    }
  }, [userRole, page])

  // Track Supabase auth session + fetch profile role
  useEffect(() => {
    const fetchRole = async (s: Session | null) => {
      if (!s?.user?.id) {
        // Keep user-chosen role from localStorage if available
        try {
          const saved = localStorage.getItem('spaceshare_user_role')
          if (saved) setUserRole(saved)
        } catch {}
        return
      }
      try {
        const { data } = await supabase.from('profiles').select('role').eq('id', s.user.id).maybeSingle()
        if (data?.role) {
          setUserRole(data.role)
        } else if (s.user.user_metadata?.role) {
          setUserRole(s.user.user_metadata.role)
        }
      } catch {
        if (s.user.user_metadata?.role) {
          setUserRole(s.user.user_metadata.role)
        }
      }
    }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); fetchRole(data.session) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => { setSession(s); fetchRole(s) })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch venues from backend — refreshes when navigating to home or browse
  const fetchVenues = useCallback(() => {
    setLoading(true)
    setApiError('')
    api
      .getVenues({ limit: '50' })
      .then(data => setVenuesList((data.venues || []).map((v, i) => mapVenue(v, i))))
      .catch(err => {
        console.error('Failed to load venues:', err)
        setApiError('Unable to load venues — make sure the backend is running: cd "space-share backend" && npm run dev')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchVenues() }, [fetchVenues])

  // Re-fetch when navigating to home or browse to pick up newly verified venues
  useEffect(() => {
    if (page === 'home' || page === 'browse') {
      fetchVenues()
    }
  }, [page, fetchVenues])

  const go = useCallback((next: Page) => {
    // Block non-admins from accessing admin page
    if (next === 'admin' && userRole !== 'admin') {
      return
    }
    setPage(next)
    location.hash = next
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [userRole])

  const handleSelectVenue = useCallback((venue: VenueCardData) => {
    setSelectedVenue(venue)
    go('detail')
  }, [go])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    go('home')
  }, [go])

  const content = useMemo(
    () => ({
      home: (
        <Home
          go={go}
          venuesList={venuesList}
          loading={loading}
          onSelectVenue={handleSelectVenue}
          savedVenueIds={savedVenueIds}
          onToggleSave={toggleSaveVenue}
          onSelectCity={city => { setBrowseCity(city); go('browse') }}
          notifications={notifications}
          unreadNotifCount={unreadNotifCount}
          onMarkRead={handleMarkNotifRead}
          onMarkAllRead={handleMarkAllNotifsRead}
          onOpenChat={handleOpenChat}
          activeHomeTab={homeTab}
          onSelectHomeTab={setHomeTab}
          userRole={userRole}
        />
      ),
      browse: (
        <Browse
          go={go}
          venuesList={venuesList}
          loading={loading}
          onSelectVenue={handleSelectVenue}
          savedVenueIds={savedVenueIds}
          onToggleSave={toggleSaveVenue}
          initialCity={browseCity}
        />
      ),
      detail: (
        <Detail
          go={go}
          venue={selectedVenue}
          session={session}
          onSetBookingDraft={setBookingDraft}
          isSaved={selectedVenue ? savedVenueIds.includes(selectedVenue.id) : false}
          onToggleSave={toggleSaveVenue}
          onOpenChat={handleOpenChat}
        />
      ),
      checkout: <Checkout go={go} session={session} bookingDraft={bookingDraft} />,
      bookings: (
        <Bookings
          go={go}
          session={session}
          savedVenueIds={savedVenueIds}
          allVenues={venuesList}
          onSelectVenue={handleSelectVenue}
          onToggleSave={toggleSaveVenue}
          onOpenChat={handleOpenChat}
        />
      ),
      host: <Host go={go} session={session} onSelectVenue={handleSelectVenue} onOpenChat={handleOpenChat} />,
      'owner-bookings': <HostReceivedBookings session={session} go={go} onOpenChat={handleOpenChat} />,
      admin: isAdmin ? <Admin session={session} /> : <main style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}><div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div><h2>Access denied</h2><p style={{ color: '#6b7280' }}>This page is restricted to administrators only.</p><Button onClick={() => go('home')}>Go to homepage</Button></main>,
      auth: <Auth go={go} />,
    })[page],
    [page, venuesList, loading, selectedVenue, session, bookingDraft, go, handleSelectVenue, isAdmin, savedVenueIds, toggleSaveVenue, browseCity, notifications, unreadNotifCount, handleMarkNotifRead, handleMarkAllNotifsRead, handleOpenChat, homeTab, userRole],
  )

  return (
    <div className="app">
      {apiError && (
        <p style={{ color: '#dc2626', textAlign: 'center', padding: '12px 20px', background: '#fef2f2', fontSize: '13px', borderBottom: '1px solid #fecaca' }}>
          ⚠️ {apiError}
        </p>
      )}
      {page !== 'auth' && (
        <Header
          page={page}
          go={go}
          session={session}
          onSignOut={handleSignOut}
          isAdmin={isAdmin}
          savedCount={savedVenueIds.length}
          onOpenSaved={() => go('bookings')}
          notifications={notifications}
          unreadNotifCount={unreadNotifCount}
          onOpenNotifications={() => { setHomeTab('notifications'); go('home') }}
          onOpenChat={handleOpenChat}
          onMarkRead={handleMarkNotifRead}
          onMarkAllRead={handleMarkAllNotifsRead}
          userRole={userRole}
          onToggleRole={r => setUserRole(r)}
        />
      )}
      {content}
      {!(['auth', 'checkout', 'admin'] as Page[]).includes(page) && <Footer go={go} />}

      {/* ─── Real-Time Live Notification Toast ─── */}
      {toastNotif && (
        <div className="chat-toast-banner">
          <div className="chat-toast-icon">
            {toastNotif.type === 'message' ? '💬' : toastNotif.type === 'booking' ? '🎉' : '🔔'}
          </div>
          <div className="chat-toast-content">
            <h5 className="chat-toast-title">{toastNotif.title}</h5>
            <p className="chat-toast-snippet">{toastNotif.message}</p>
            <div className="chat-toast-actions">
              {toastNotif.venue_id && (
                <button
                  className="chat-toast-btn"
                  onClick={() => {
                    handleMarkNotifRead(toastNotif.id)
                    handleOpenChat({
                      id: toastNotif.venue_id!,
                      title: toastNotif.venue_title || 'Event Venue',
                    })
                    setToastNotif(null)
                  }}
                >
                  💬 Open Chat
                </button>
              )}
              <button
                className="chat-toast-btn"
                style={{ background: '#f3f4f6', color: '#4b5563' }}
                onClick={() => {
                  handleMarkNotifRead(toastNotif.id)
                  setToastNotif(null)
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            className="chat-toast-close"
            onClick={() => setToastNotif(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* ─── Live Two-Way Chat Modal between Host and User ─── */}
      {isChatOpen && activeChatVenue && (
        <ChatModal
          venue={activeChatVenue}
          onClose={handleCloseChat}
          onNewNotification={handleNewNotification}
          currentUserRole={userRole === 'owner' ? 'owner' : 'user'}
        />
      )}
    </div>
  )
}
