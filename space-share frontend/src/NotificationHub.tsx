import { useState } from 'react'
import type { BackendNotification } from './api'
import type { ActiveChatVenue } from './ChatModal'

interface NotificationHubProps {
  notifications: BackendNotification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onOpenChat: (venue: ActiveChatVenue) => void
  onGoToBrowse?: () => void
}

export function NotificationHub({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onOpenChat,
  onGoToBrowse,
}: NotificationHubProps) {
  const [filter, setFilter] = useState<'all' | 'message' | 'booking' | 'unread'>('all')

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'message') return n.type === 'message'
    if (filter === 'booking') return n.type === 'booking'
    return true
  })

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return 'Just now'
    try {
      const diffMs = Date.now() - new Date(iso).getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    } catch {
      return 'Recently'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬'
      case 'booking': return '🎉'
      case 'review': return '⭐'
      default: return '🛡️'
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '16px 0 40px' }}>
      <div className="notification-hub-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 24, color: 'var(--ink)' }}>
              Notifications & Messages
            </h2>
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--coral)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 999,
              }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Real-time chat alerts from venue hosts, booking confirmations and celebration updates
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{
              background: '#fff3ee',
              border: '1px solid rgba(244, 98, 58, 0.3)',
              color: 'var(--coral)',
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>✓ Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-tabs" style={{ marginBottom: 20 }}>
        <button
          className={`notif-tab-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <span>All Alerts</span>
          <span style={{ opacity: 0.7 }}>({notifications.length})</span>
        </button>
        <button
          className={`notif-tab-btn${filter === 'message' ? ' active' : ''}`}
          onClick={() => setFilter('message')}
        >
          <span>💬 Host Messages</span>
          <span style={{ opacity: 0.7 }}>
            ({notifications.filter(n => n.type === 'message').length})
          </span>
        </button>
        <button
          className={`notif-tab-btn${filter === 'booking' ? ' active' : ''}`}
          onClick={() => setFilter('booking')}
        >
          <span>🎉 Bookings</span>
          <span style={{ opacity: 0.7 }}>
            ({notifications.filter(n => n.type === 'booking').length})
          </span>
        </button>
        <button
          className={`notif-tab-btn${filter === 'unread' ? ' active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          <span>🔔 Unread Only</span>
          <span style={{ opacity: 0.7 }}>({unreadCount})</span>
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifs.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          border: '1.5px dashed var(--line)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🔔</div>
          <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>You're all caught up!</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 20px', maxWidth: 400, marginInline: 'auto' }}>
            {filter === 'unread'
              ? 'No unread notifications right now. New host messages and booking alerts will appear here.'
              : 'No alerts match this filter. Inquire with any venue host to start a live conversation.'}
          </p>
          {onGoToBrowse && (
            <button
              onClick={onGoToBrowse}
              style={{
                background: 'var(--coral)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Explore Venues & Message Hosts →
            </button>
          )}
        </div>
      ) : (
        <div className="notif-grid">
          {filteredNotifs.map(notif => {
            const hasChatAction = notif.venue_id || notif.type === 'message'
            return (
              <div
                key={notif.id}
                className={`notif-card ${!notif.read ? 'unread' : ''}`}
              >
                {!notif.read && <div className="notif-unread-dot" />}
                <div className={`notif-card-icon ${notif.type}`}>
                  {getIcon(notif.type)}
                </div>

                <div className="notif-card-body">
                  <div className="notif-card-top">
                    <h4 className="notif-card-title">{notif.title}</h4>
                    <span className="notif-card-time">{formatTimeAgo(notif.created_at)}</span>
                  </div>

                  <p className="notif-card-message">{notif.message}</p>

                  <div className="notif-card-tags">
                    {notif.venue_title && (
                      <span className="notif-venue-tag">
                        🏛️ {notif.venue_title}
                      </span>
                    )}

                    {hasChatAction && (
                      <button
                        className="notif-open-chat-btn"
                        onClick={() => {
                          onMarkRead(notif.id)
                          onOpenChat({
                            id: notif.venue_id || '1',
                            title: notif.venue_title || 'Event Venue',
                          })
                        }}
                      >
                        <span>💬 Open Chat</span>
                      </button>
                    )}

                    {!notif.read && (
                      <button
                        className="notif-mark-read-btn"
                        onClick={() => onMarkRead(notif.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
