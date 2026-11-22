import { supabase } from './lib/supabase'

const BASE = import.meta.env.VITE_API_URL || '/api'

// ─── Types ──────────────────────────────────────────────────────────────────

export type Page = 'home' | 'browse' | 'detail' | 'checkout' | 'bookings' | 'host' | 'admin' | 'auth' | 'owner-bookings'

export interface BackendVenue {
  id: string
  title: string
  name: string
  description: string
  address: string
  city: string
  state: string
  pincode?: string
  country: string
  capacity: number | null
  price_per_hour: number | null
  price_per_day: number | null
  amenities: string[]
  rules: string
  is_active: boolean
  is_verified: boolean
  venue_images: Array<{ id: string; image_url: string; is_primary: boolean; caption: string }>
  venue_event_types: Array<{ id: string; event_type: string }>
  venue_availability: Array<Record<string, unknown>>
  created_at: string
}

export interface BackendBooking {
  id: string
  venue_id: string
  renter_id: string
  booking_date: string
  start_time: string
  end_time: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  hold_expires_at: string
  created_at: string
  venues?: { id: string; name: string; title: string; address: string; city: string; capacity?: number | null; image_url?: string }
}

export interface AdminVerification {
  id: string
  venue_id: string
  submitted_by: string
  id_proof_url: string
  address_proof_url: string
  geotag_lat: number | null
  geotag_lng: number | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  venues?: BackendVenue & { profiles?: { id: string; full_name: string; email: string; phone: string } }
}

export interface BackendConversation {
  id: string
  venue_id: string
  venue_title: string
  venue_city?: string
  venue_image?: string
  user_id: string
  user_name: string
  owner_id: string
  owner_name: string
  last_message?: string
  last_message_at?: string
  unread_user_count?: number
  unread_owner_count?: number
  created_at: string
}

export interface BackendChatMessage {
  id: string
  conversation_id: string
  venue_id: string
  sender_role: 'user' | 'owner' | 'system'
  sender_id?: string
  sender_name: string
  recipient_role: 'user' | 'owner' | 'all'
  recipient_id?: string
  content: string
  read: boolean
  created_at: string
}

export interface BackendNotification {
  id: string
  user_id?: string
  target_role: 'user' | 'owner' | 'all'
  type: 'message' | 'booking' | 'review' | 'system'
  title: string
  message: string
  venue_id?: string
  venue_title?: string
  conversation_id?: string
  read: boolean
  created_at: string
}

// ─── Core fetch wrapper ─────────────────────────────────────────────────────

async function getHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`
  return h
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await getHeaders()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`)
  }
  return json.data as T
}

// ─── API methods ────────────────────────────────────────────────────────────

export const api = {
  /** GET /venues  – public listing (is_active + is_verified only) */
  getVenues: (params?: Record<string, string>) =>
    req<{ venues: BackendVenue[]; total: number; page: number; limit: number }>(
      '/venues' + (params ? '?' + new URLSearchParams(params).toString() : ''),
    ),

  /** GET /venues/:id */
  getVenueById: (id: string) => req<{ venue: BackendVenue }>(`/venues/${id}`),

  /** POST /venues  – auth required */
  createVenue: (payload: {
    title: string
    description?: string
    address: string
    city: string
    state?: string
    capacity?: number
    price_per_day?: number
    price_per_hour?: number
    amenities?: string[]
    venue_type?: string
    rules?: string
  }) =>
    req<{ venue: BackendVenue }>('/venues', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** POST /bookings  – auth required */
  createBooking: (payload: {
    venue_id: string
    booking_date: string
    start_time: string
    end_time: string
    total_amount: number
  }) =>
    req<{ booking: BackendBooking }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** GET /bookings/my-bookings  – auth required */
  getMyBookings: () => req<{ bookings: BackendBooking[] }>('/bookings/my-bookings'),

  /** GET /bookings/venue-bookings  – auth required (venue owner) */
  getVenueOwnerBookings: () =>
    req<{ bookings: BackendBooking[] }>('/bookings/venue-bookings'),

  /** GET /venues/my-venues  – auth required (owner sees their own venues) */
  getMyVenues: () => req<{ venues: BackendVenue[] }>('/venues/my-venues'),

  /** POST /venues/:id/images  – multipart upload, auth required */
  uploadVenueImage: async (venueId: string, file: File, isPrimary = false): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession()
    const form = new FormData()
    form.append('image', file)
    form.append('is_primary', String(isPrimary))
    const res = await fetch(`${BASE}/venues/${venueId}/images`, {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Image upload failed')
  },

  /** POST /verifications/submit  – multipart, auth required */
  submitVerification: async (payload: {
    venue_id: string
    id_proof?: File
    address_proof?: File
  }): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession()
    const form = new FormData()
    form.append('venue_id', payload.venue_id)
    if (payload.id_proof) form.append('id_proof', payload.id_proof)
    if (payload.address_proof) form.append('address_proof', payload.address_proof)
    const res = await fetch(`${BASE}/verifications/submit`, {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Verification submission failed')
  },

  /** POST /auth/signup  – creates user + profile in one step */
  signup: (email: string, password: string, full_name: string, role: string) =>
    req<{ session: { access_token: string; refresh_token: string } | null; user: unknown; profile: unknown }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify({ email, password, full_name, role }) },
    ),

  /** POST /auth/login */
  login: (email: string, password: string) =>
    req<{ session: { access_token: string; refresh_token: string } | null; user: unknown; profile: unknown }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  // ─── Admin APIs ────────────────────────────────────────────────────────────

  /** GET /verifications?status=pending  – admin only */
  getVerifications: (status?: string) =>
    req<{ verifications: AdminVerification[]; total: number; page: number; limit: number }>(
      '/verifications' + (status ? `?status=${status}` : ''),
    ),

  /** POST /verifications/:id/review  – admin approve/reject */
  reviewVerification: (id: string, action: 'approve' | 'reject', rejection_reason?: string, admin_notes?: string) =>
    req<{ verification: AdminVerification; is_verified: boolean }>(
      `/verifications/${id}/review`,
      { method: 'POST', body: JSON.stringify({ action, rejection_reason, admin_notes }) },
    ),

  // ─── Reviews & Ratings APIs ────────────────────────────────────────────────

  /** GET /venues/:id/reviews – fetch all ratings, statistics & organizer reviews */
  getVenueReviews: (venueId: string, eventType?: string, sort?: string) => {
    const params = new URLSearchParams()
    if (eventType && eventType !== 'All') params.append('event_type', eventType)
    if (sort) params.append('sort', sort)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return req<{
      venue_id: string
      stats: {
        average_rating: number
        total_reviews: number
        breakdown: {
          cleanliness: number
          hospitality: number
          accuracy: number
          sound_lighting: number
          location_parking: number
          value_for_money: number
        }
        distribution: Record<string, number>
      }
      reviews: Array<{
        id: string
        venue_id: string
        author_name: string
        author_city: string
        rating: number
        event_type: string
        guest_count: number
        comment: string
        verified_stay: boolean
        host_reply?: string
        created_at: string
      }>
    }>(`/venues/${venueId}/reviews${qs}`)
  },

  /** POST /venues/:id/reviews – submit a new review and rating */
  addVenueReview: (
    venueId: string,
    payload: {
      rating: number
      comment: string
      author_name?: string
      author_city?: string
      event_type?: string
      guest_count?: number
      cleanliness?: number
      hospitality?: number
      accuracy?: number
      sound_lighting?: number
      location_parking?: number
      value_for_money?: number
    },
  ) =>
    req<{
      review: {
        id: string
        venue_id: string
        author_name: string
        author_city: string
        rating: number
        event_type: string
        guest_count: number
        comment: string
        verified_stay: boolean
        created_at: string
      }
      stats: unknown
    }>(`/venues/${venueId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** POST /venues/:id/reviews/:reviewId/reply – host response */
  replyToReview: (venueId: string, reviewId: string, reply: string) =>
    req<{ reviewId: string; host_reply: string }>(`/venues/${venueId}/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    }),

  // ─── Messaging & Real-Time Chat ──────────────────────────────────────────

  /** GET /messages/conversations */
  getConversations: (params?: { role?: string; venue_id?: string; user_id?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return req<{ conversations: BackendConversation[] }>(`/messages/conversations${qs}`)
  },

  /** GET /messages/conversations/:id (or by venue_id) */
  getConversation: (idOrVenueId: string) =>
    req<{ conversation: BackendConversation | null; messages: BackendChatMessage[] }>(
      `/messages/conversations/${idOrVenueId}`,
    ),

  /** POST /messages – send message with automatic notification and simulated host reply */
  sendMessage: (payload: {
    conversation_id?: string
    venue_id: string
    venue_title?: string
    venue_image?: string
    venue_city?: string
    content: string
    sender_role?: 'user' | 'owner'
    sender_name?: string
    sender_id?: string
    auto_reply?: boolean
  }) =>
    req<{
      message: BackendChatMessage
      conversation: BackendConversation
      notification: BackendNotification
      host_reply?: BackendChatMessage | null
      host_notification?: BackendNotification | null
    }>('/messages/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ─── Notifications Center ────────────────────────────────────────────────

  /** GET /notifications */
  getNotifications: (params?: { role?: string; user_id?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return req<{ notifications: BackendNotification[]; unread_count: number }>(`/notifications${qs}`)
  },

  /** PATCH /notifications/:id/read */
  markNotificationRead: (id: string) =>
    req<{ notification: BackendNotification; unread_count: number }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  /** POST /notifications/read-all */
  markAllNotificationsRead: () =>
    req<{ unread_count: number }>('/notifications/read-all', {
      method: 'POST',
    }),
}
