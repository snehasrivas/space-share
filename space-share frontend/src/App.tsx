import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { api, type BackendVenue, type BackendBooking, type AdminVerification } from './api'
import './mobile-nav.css'

// re-export for any legacy imports
export { supabase }

// ─── Types ──────────────────────────────────────────────────────────────────

type Page = 'home' | 'browse' | 'detail' | 'checkout' | 'bookings' | 'host' | 'admin' | 'auth'

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
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button type={type} className={`button ${variant} ${className}`} onClick={onClick} disabled={disabled}>
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
  page, go, session, onSignOut, isAdmin,
}: {
  page: Page; go: (p: Page) => void; session: Session | null; onSignOut: () => void; isAdmin: boolean
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navigate = (p: Page) => { go(p); setDrawerOpen(false) }

  return (
    <>
      <header className="header"><div className="nav-wrap"><Logo go={go} /><nav>
        <button className={page === 'browse' ? 'active' : ''} onClick={() => go('browse')}>Explore venues</button>
        <button className={page === 'bookings' ? 'active' : ''} onClick={() => go('bookings')}>My bookings</button>
        <button className={page === 'host' ? 'active' : ''} onClick={() => go('host')}>List your space</button>
        {isAdmin && <button className={page === 'admin' ? 'active' : ''} onClick={() => go('admin')} style={{ color: page === 'admin' ? '#e07653' : '#e07653', fontWeight: 700 }}>🛡️ Admin</button>}
      </nav><div className="nav-actions">
        <button className="icon-button" aria-label="Saved venues">♡</button>
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
            <button className={page === 'browse' ? 'active' : ''} onClick={() => navigate('browse')}>🔍 Explore venues</button>
            <button className={page === 'host' ? 'active' : ''} onClick={() => navigate('host')}>🏛️ List your space</button>
            <button className={page === 'bookings' ? 'active' : ''} onClick={() => navigate('bookings')}>📋 My bookings</button>
            {isAdmin && <button className={page === 'admin' ? 'active' : ''} onClick={() => navigate('admin')} style={{ color: '#e07653', fontWeight: 700 }}>🛡️ Admin panel</button>}
          </nav>
          <div className="mobile-drawer-footer">
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

function SearchBar({ go }: { go: (p: Page) => void }) {
  return <div className="search-bar"><button><small>WHERE</small><strong>Delhi NCR</strong></button><button><small>WHEN</small><strong>Choose a date</strong></button><button><small>GUESTS</small><strong>100–200 guests</strong></button><Button onClick={() => go('browse')}>Search</Button></div>
}

function VenueCard({ venue, onSelect }: { venue: VenueCardData; onSelect: (v: VenueCardData) => void }) {
  return (
    <article className="venue-card" onClick={() => onSelect(venue)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onSelect(venue)}>
      <div className="card-image">
        <img src={venue.image} alt={venue.name} />
        <span className="tag">{venue.tag}</span>
        <button className="heart" aria-label={`Save ${venue.name}`} onClick={e => e.stopPropagation()}>♡</button>
      </div>
      <div className="card-copy"><div><h3>{venue.name}</h3><p>{venue.place}</p></div><strong>★ {venue.rating}</strong></div>
      <div className="card-meta"><span>{venue.guests}</span><span>·</span><span>{venue.tag}</span></div>
      <p className="price"><strong>{venue.price}</strong> / day</p>
    </article>
  )
}

// ─── Page: Home ──────────────────────────────────────────────────────────────

function Home({ go, venuesList, loading, onSelectVenue }: {
  go: (p: Page) => void; venuesList: VenueCardData[]; loading: boolean; onSelectVenue: (v: VenueCardData) => void
}) {
  return (
    <>
      <section className="hero">
        <div className="hero-image"></div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="eyebrow">Celebrate somewhere unforgettable</span>
          <h1>Find a space that feels <em>just right.</em></h1>
          <p>Verified venues for weddings, birthdays and every joyful gathering in between.</p>
          <SearchBar go={go} />
        </div>
      </section>
      <main>
        <section className="section">
          <div className="section-heading">
            <div><span className="eyebrow coral">HANDPICKED FOR YOU</span><h2>Spaces worth celebrating in</h2></div>
            <button className="text-link" onClick={() => go('browse')}>View all spaces →</button>
          </div>
          {loading ? (
            <p style={{ padding: '20px 0' }}>Loading venues…</p>
          ) : venuesList.length === 0 ? (
            <p style={{ padding: '20px 0', color: '#9ca3af' }}>No verified venues available yet. Venues must be verified in the Admin portal before appearing here.</p>
          ) : (
            <div className="venue-grid">
              {venuesList.slice(0, 3).map(v => <VenueCard key={v.id} venue={v} onSelect={onSelectVenue} />)}
            </div>
          )}
        </section>
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
      </main>
    </>
  )
}

// ─── Page: Browse ─────────────────────────────────────────────────────────────

function Browse({ go, venuesList, loading, onSelectVenue }: {
  go: (p: Page) => void; venuesList: VenueCardData[]; loading: boolean; onSelectVenue: (v: VenueCardData) => void
}) {
  const [filter, setFilter] = useState('All spaces')
  const filteredVenues = venuesList.filter(v => {
    if (filter === 'All spaces') return true
    const n = v.name.toLowerCase(), t = v.tag.toLowerCase()
    if (filter === 'Farmhouses') return n.includes('farm') || t.includes('farm')
    if (filter === 'Banquet halls') return n.includes('banquet') || t.includes('banquet')
    if (filter === 'Rooftops') return n.includes('rooftop') || t.includes('rooftop')
    if (filter === 'Lawns') return n.includes('lawn') || t.includes('lawn')
    return true
  })
  return (
    <main className="browse-page">
      <div className="browse-top">
        <span className="eyebrow coral">ALL INDIA</span>
        <h1>Spaces for your celebration</h1>
        <p>{venuesList.length} verified venues · prices shown before taxes</p>
      </div>
      <div className="filter-row">
        {['All spaces', 'Farmhouses', 'Banquet halls', 'Rooftops', 'Lawns'].map(f => (
          <button className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)} key={f}>{f}</button>
        ))}
        <button className="filter-button">Filters <span>3</span></button>
      </div>
      <div className="results-head"><strong>{filteredVenues.length} spaces</strong><button>Sort: Recommended⌄</button></div>
      {loading ? (
        <p style={{ padding: '40px 0', textAlign: 'center' }}>Loading spaces…</p>
      ) : filteredVenues.length === 0 ? (
        <p style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>No venues match this filter yet.</p>
      ) : (
        <div className="venue-grid browse-grid">
          {filteredVenues.map(v => <VenueCard key={v.id} venue={v} onSelect={onSelectVenue} />)}
        </div>
      )}
      <Button variant="secondary" className="load">Show more spaces</Button>
    </main>
  )
}

// ─── Page: Detail ─────────────────────────────────────────────────────────────

function Detail({ go, venue, session, onSetBookingDraft }: {
  go: (p: Page) => void; venue: VenueCardData | null; session: Session | null; onSetBookingDraft: (d: BookingDraft) => void
}) {
  const [bookingDate, setBookingDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('22:00')
  const [guestCount, setGuestCount] = useState(100)
  const today = new Date().toISOString().split('T')[0]

  if (!venue) {
    return (
      <main style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p>No venue selected. <button style={{ color: 'var(--primary,#e07653)', textDecoration: 'underline' }} onClick={() => go('browse')}>Browse venues</button></p>
      </main>
    )
  }

  const raw = venue._raw
  const images = raw.venue_images?.length > 0 ? raw.venue_images.slice(0, 3).map(i => i.image_url) : [venue.image, photos[2], photos[1]]
  const amenities = Array.isArray(raw.amenities) ? raw.amenities : []
  const venueFee = raw.price_per_day ?? (raw.price_per_hour ? raw.price_per_hour * 12 : 45000)
  const cleaningFee = 3500
  const platformFee = Math.round(venueFee * 0.05)
  const total = venueFee + cleaningFee + platformFee

  const handleRequestBook = () => {
    if (!bookingDate) { alert('Please select an event date.'); return }
    if (!session) {
      if (window.confirm('You need to sign in to book a venue. Go to sign in?')) go('auth')
      return
    }
    onSetBookingDraft({ venue_id: raw.id, venue_name: venue.name, venue_image: venue.image, venue_city: venue.place, booking_date: bookingDate, start_time: startTime, end_time: endTime, guest_count: guestCount, total_amount: total, venue_fee: venueFee })
    go('checkout')
  }

  return (
    <main className="detail-page">
      <button className="back" onClick={() => go('browse')}>← Back to results</button>
      <div className="detail-title">
        <div><span className="tag inline">{venue.tag}</span><h1>{venue.name}</h1><p>★ {venue.rating} · {venue.place}</p></div>
        <div><button className="share">↗ Share</button><button className="share">♡ Save</button></div>
      </div>
      <div className="gallery">{images.map((src, i) => <img key={i} src={src} alt={`${venue.name} view ${i + 1}`} />)}</div>
      <div className="detail-layout">
        <div className="detail-content">
          <div className="facts">
            {raw.capacity && <span><strong>{raw.capacity}</strong> max guests</span>}
            {amenities.slice(0, 3).map(a => <span key={a}>✓ {a}</span>)}
          </div>
          {raw.description && <section><h2>About this space</h2><p>{raw.description}</p></section>}
          {amenities.length > 0 && <section><h2>Amenities guests love</h2><div className="amenities">{amenities.map(x => <span key={x}>✓ {x}</span>)}</div></section>}
          {raw.venue_event_types?.length > 0 && <section><h2>Suitable for</h2><div className="amenities">{raw.venue_event_types.map(et => <span key={et.id}>✓ {et.event_type}</span>)}</div></section>}
          {raw.rules && <section><h2>Venue rules</h2><p>{raw.rules}</p></section>}
        </div>
        <aside className="booking-card">
          <p><strong>{formatPrice(raw.price_per_day ?? raw.price_per_hour)}</strong>{raw.price_per_day ? ' / day' : ' / hour'}</p>
          <div className="date-grid">
            <label className="field"><span>EVENT DATE</span><input type="date" value={bookingDate} min={today} onChange={e => setBookingDate(e.target.value)} /></label>
            <label className="field"><span>GUESTS</span><input type="number" value={guestCount} min={1} max={raw.capacity ?? 9999} onChange={e => setGuestCount(Number(e.target.value))} /></label>
          </div>
          <div className="date-grid">
            <label className="field"><span>START TIME</span><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></label>
            <label className="field"><span>END TIME</span><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></label>
          </div>
          <div className="price-line"><span>Venue hire</span><span>{formatPrice(venueFee)}</span></div>
          <div className="price-line"><span>Cleaning fee</span><span>{formatPrice(cleaningFee)}</span></div>
          <div className="price-line"><span>Platform fee (5%)</span><span>{formatPrice(platformFee)}</span></div>
          <div className="price-line total"><strong>Total</strong><strong>{formatPrice(total)}</strong></div>
          <Button className="wide" onClick={handleRequestBook}>Request to book</Button>
          <small>You won't be charged yet</small>
          <div className="safe">✓ Free cancellation for 48 hours</div>
        </aside>
      </div>
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

function Bookings({ go, session }: { go: (p: Page) => void; session: Session | null }) {
  const [bookings, setBookings] = useState<BackendBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')

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
        <div className="dashboard-head"><span className="eyebrow coral">YOUR CELEBRATIONS</span><h1>My bookings</h1><p>Sign in to view your bookings.</p></div>
        <Button onClick={() => go('auth')}>Sign in</Button>
      </main>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = bookings.filter(b => {
    if (tab === 'upcoming') return b.booking_date >= today && b.status !== 'cancelled'
    if (tab === 'past') return b.booking_date < today && b.status !== 'cancelled'
    return b.status === 'cancelled'
  })

  return (
    <main className="dashboard">
      <div className="dashboard-head"><span className="eyebrow coral">YOUR CELEBRATIONS</span><h1>My bookings</h1><p>Everything you need, all in one place.</p></div>
      <div className="tabs">
        <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>Past</button>
        <button className={tab === 'cancelled' ? 'active' : ''} onClick={() => setTab('cancelled')}>Cancelled</button>
      </div>
      {loading && <p style={{ padding: '40px', textAlign: 'center' }}>Loading your bookings…</p>}
      {error && <p style={{ color: '#dc2626', padding: '16px', background: '#fef2f2', borderRadius: '8px', margin: '16px 0' }}>{error}</p>}
      {!loading && filtered.map(b => {
        const venueName = b.venues?.title || b.venues?.name || 'Venue'
        const venueCity = b.venues?.city || ''
        const ref = `SS-${b.id.substring(0, 6).toUpperCase()}`
        const statusClass = b.status === 'confirmed' ? 'confirmed' : b.status === 'cancelled' ? 'cancelled' : ''
        return (
          <article className="booking-item" key={b.id}>
            <img src={photos[0]} alt="" />
            <div className="booking-main">
              <span className={`status ${statusClass}`}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span>
              <h2>{venueName}</h2>
              <p>{b.booking_date} · {b.start_time}–{b.end_time}{venueCity ? ` · ${venueCity}` : ''}</p>
              <div className="booking-code">Booking {ref} · {formatPrice(b.total_amount)} {b.payment_status === 'paid' ? 'paid' : '(payment pending)'}</div>
              <div className="booking-actions"><Button variant="secondary">Message host</Button></div>
            </div>
          </article>
        )
      })}
      {!loading && !error && filtered.length === 0 && (
        <section className="empty-card">
          <div>＋</div>
          <h2>{tab === 'cancelled' ? 'No cancelled bookings' : tab === 'past' ? 'No past bookings' : 'Planning a celebration?'}</h2>
          <p>{tab === 'upcoming' ? 'Explore verified spaces with clear prices and thoughtful hosts.' : `You have no ${tab} bookings.`}</p>
          {tab === 'upcoming' && <Button variant="secondary" onClick={() => go('browse')}>Find a venue</Button>}
        </section>
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

function HostMyListings({ session }: { session: Session }) {
  const [venues, setVenues] = useState<BackendVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getMyVenues()
      .then(data => setVenues(data.venues || []))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [session])

  if (loading) return <p style={{ padding: '32px 0', color: '#6b7280' }}>Loading your listings…</p>
  if (error) return <p style={{ padding: '32px 0', color: '#dc2626' }}>⚠️ {error}</p>

  if (venues.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
        <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>You haven't listed any spaces yet.</p>
        <p style={{ fontSize: '14px', color: '#9ca3af' }}>Use the "List new space" tab to submit your first venue.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {venues.map(v => (
        <div key={v.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* Thumbnail */}
          {v.venue_images && v.venue_images.length > 0 ? (
            <img
              src={(v.venue_images.find(i => i.is_primary) || v.venue_images[0]).image_url}
              alt={v.title}
              style={{ width: '88px', height: '72px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '88px', height: '72px', background: '#f3f4f6', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏛️</div>
          )}
          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>{v.title}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{v.city}{v.state ? `, ${v.state}` : ''} {v.address ? `· ${v.address}` : ''}</p>
              </div>
              {/* Verification badge */}
              <span style={{
                padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                background: v.is_verified ? '#dcfce7' : '#fef3c7',
                color: v.is_verified ? '#15803d' : '#92400e',
                flexShrink: 0,
              }}>
                {v.is_verified ? '✓ Verified' : '⏳ Pending review'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
              {v.capacity && <span style={{ fontSize: '13px', color: '#374151' }}>👥 Up to {v.capacity} guests</span>}
              {v.price_per_day && <span style={{ fontSize: '13px', color: '#374151' }}>₹{v.price_per_day.toLocaleString('en-IN')} / day</span>}
              {v.price_per_hour && <span style={{ fontSize: '13px', color: '#374151' }}>₹{v.price_per_hour.toLocaleString('en-IN')} / hr</span>}
              {v.venue_event_types && v.venue_event_types.length > 0 && (
                <span style={{ fontSize: '13px', color: '#374151' }}>🎉 {v.venue_event_types.map(t => t.event_type).join(', ')}</span>
              )}
            </div>
            {!v.is_verified && (
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#78716c', background: '#fef9f0', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                Your listing is under review. Our team verifies venue details within 2–3 business days before it appears publicly.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function Host({ go, session }: { go: (p: Page) => void; session: Session | null }) {
  const [tab, setTab] = useState<'list' | 'my-listings'>('list')
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
      <div className="host-hero">
        <div><span className="eyebrow">BECOME A SPACESHARE HOST</span>
          <h1>Your space has a story.<br />Let celebrations become part of it.</h1>
          <p>Join trusted venue owners across India. You set the price — we handle discovery, payments & support.</p>
        </div>
        <div className="host-stat"><strong>₹68k</strong><span>average monthly host earnings</span></div>
      </div>
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        {(['list', 'my-listings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', borderBottom: tab === t ? '2px solid #e07653' : '2px solid transparent', color: tab === t ? '#e07653' : '#6b7280', marginBottom: -2 }}>
            {t === 'list' ? '+ List new space' : 'My listings'}
          </button>
        ))}
      </div>
      {tab === 'my-listings' ? (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>My property listings</h2>
          <HostMyListings session={session} />
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
  const [userRole, setUserRole] = useState<string>('renter')
  const [venuesList, setVenuesList] = useState<VenueCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<VenueCardData | null>(null)
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null)

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
      if (!s?.user?.id) { setUserRole('renter'); return }
      try {
        const { data } = await supabase.from('profiles').select('role').eq('id', s.user.id).maybeSingle()
        setUserRole(data?.role || s.user.user_metadata?.role || 'renter')
      } catch { setUserRole(s.user.user_metadata?.role || 'renter') }
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
      home: <Home go={go} venuesList={venuesList} loading={loading} onSelectVenue={handleSelectVenue} />,
      browse: <Browse go={go} venuesList={venuesList} loading={loading} onSelectVenue={handleSelectVenue} />,
      detail: <Detail go={go} venue={selectedVenue} session={session} onSetBookingDraft={setBookingDraft} />,
      checkout: <Checkout go={go} session={session} bookingDraft={bookingDraft} />,
      bookings: <Bookings go={go} session={session} />,
      host: <Host go={go} session={session} />,
      admin: isAdmin ? <Admin session={session} /> : <main style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}><div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div><h2>Access denied</h2><p style={{ color: '#6b7280' }}>This page is restricted to administrators only.</p><Button onClick={() => go('home')}>Go to homepage</Button></main>,
      auth: <Auth go={go} />,
    })[page],
    [page, venuesList, loading, selectedVenue, session, bookingDraft, go, handleSelectVenue, isAdmin],
  )

  return (
    <div className="app">
      {apiError && (
        <p style={{ color: '#dc2626', textAlign: 'center', padding: '12px 20px', background: '#fef2f2', fontSize: '13px', borderBottom: '1px solid #fecaca' }}>
          ⚠️ {apiError}
        </p>
      )}
      {page !== 'auth' && <Header page={page} go={go} session={session} onSignOut={handleSignOut} isAdmin={isAdmin} />}
      {content}
      {!(['auth', 'checkout', 'admin'] as Page[]).includes(page) && <Footer go={go} />}
    </div>
  )
}
