import { useState, useEffect, useRef, FormEvent } from 'react'
import { api, type BackendChatMessage, type BackendConversation, type BackendNotification } from './api'

export interface ActiveChatVenue {
  id: string
  title: string
  image?: string
  city?: string
  hostName?: string
  hostRole?: string
}

interface ChatModalProps {
  venue: ActiveChatVenue
  onClose: () => void
  onNewNotification?: (notif: BackendNotification) => void
  currentUserRole?: 'user' | 'owner'
}

const QUICK_CHIPS = [
  'Is outside catering permitted? 🍽️',
  'Can we arrange early decor access? 🎨',
  'Confirming 100% generator backup ⚡',
  'What is the sound limit & cutoff time? 🎵',
  'How many valet parking spots are available? 🚗',
]

export function ChatModal({
  venue,
  onClose,
  onNewNotification,
  currentUserRole = 'user',
}: ChatModalProps) {
  const [messages, setMessages] = useState<BackendChatMessage[]>([])
  const [conversation, setConversation] = useState<BackendConversation | null>(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isGuest = currentUserRole === 'user'
  const hostName = venue.hostName || conversation?.owner_name || 'Rajesh Verma (Host)'
  const guestName = conversation?.user_name || 'Priya Sharma (Guest Organizer)'

  // The counterpart party being spoken to
  const otherPartyName = isGuest ? hostName : guestName
  const otherPartySubtitle = isGuest ? 'Verified Venue Partner · Typically replies in 15 mins' : 'Guest Organizer · Celebration Inquiry'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load existing conversation thread on mount
  useEffect(() => {
    let isMounted = true
    api.getConversation(venue.id)
      .then(res => {
        if (!isMounted) return
        setConversation(res.conversation)
        if (res.messages && res.messages.length > 0) {
          setMessages(res.messages)
        } else {
          // Fallback initial greeting message from Host if brand new thread
          const initialGreeting: BackendChatMessage = {
            id: `init_${Date.now()}`,
            conversation_id: `conv_${venue.id}`,
            venue_id: venue.id,
            sender_role: 'owner',
            sender_name: hostName,
            recipient_role: 'user',
            content: `Namaste! Welcome to ${venue.title}. I am the venue host. Feel free to ask any questions about availability, catering, music policies, or decor setup!`,
            read: true,
            created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          }
          setMessages([initialGreeting])
        }
      })
      .catch(err => {
        console.warn('Could not load chat conversation from backend, using fallback:', err)
        const fallbackGreeting: BackendChatMessage = {
          id: `init_${Date.now()}`,
          conversation_id: `conv_${venue.id}`,
          venue_id: venue.id,
          sender_role: 'owner',
          sender_name: hostName,
          recipient_role: 'user',
          content: `Namaste! Welcome to ${venue.title}. I'm here to assist you with dates, catering packages, and scheduling a walkthrough. How can I help with your celebration?`,
          read: true,
          created_at: new Date().toISOString(),
        }
        setMessages([fallbackGreeting])
      })

    return () => { isMounted = false }
  }, [venue.id, venue.title, hostName])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isOtherTyping])

  const handleSendMessage = async (e?: FormEvent, customText?: string) => {
    if (e) e.preventDefault()
    const content = (customText || inputText).trim()
    if (!content || sending) return

    setSending(true)
    setError('')
    if (!customText) setInputText('')

    const senderRole = currentUserRole
    const senderName = isGuest ? guestName : hostName

    // Optimistically append sender message
    const tempMsg: BackendChatMessage = {
      id: `temp_${Date.now()}`,
      conversation_id: conversation?.id || `conv_${venue.id}`,
      venue_id: venue.id,
      sender_role: senderRole,
      sender_name: senderName,
      recipient_role: isGuest ? 'owner' : 'user',
      content,
      read: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const res = await api.sendMessage({
        conversation_id: conversation?.id,
        venue_id: venue.id,
        venue_title: venue.title,
        venue_image: venue.image,
        venue_city: venue.city,
        content,
        sender_role: senderRole,
        sender_name: senderName,
        auto_reply: isGuest, // Auto-reply from host when guest sends inquiry
      })

      if (res.conversation) {
        setConversation(res.conversation)
      }

      // Notify recipient in state / toast
      if (res.notification && onNewNotification) {
        onNewNotification(res.notification)
      }

      // If user sent message, show typing indicator for host response
      if (isGuest && res.host_reply) {
        setIsOtherTyping(true)
        setTimeout(() => {
          setIsOtherTyping(false)
          setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), res.message, res.host_reply!])
          if (res.host_notification && onNewNotification) {
            onNewNotification(res.host_notification)
          }
        }, 1200)
      } else {
        setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), res.message])
      }
    } catch (err: unknown) {
      console.error('Failed to send message:', err)
      setError((err as Error).message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatMsgTime = (isoString?: string) => {
    if (!isoString) return 'Just now'
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Just now'
    }
  }

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-window" onClick={e => e.stopPropagation()}>
        {/* Header — clean and focused on the venue and host */}
        <div className="chat-modal-header">
          <div className="chat-header-main">
            <div className="chat-venue-identity">
              {venue.image ? (
                <img src={venue.image} alt={venue.title} className="chat-venue-thumb" />
              ) : (
                <div className="chat-venue-thumb" style={{ background: '#fff3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  🏛️
                </div>
              )}
              <div className="chat-venue-info">
                <h3>{venue.title}</h3>
                <p>
                  <span className="chat-online-dot" />
                  <strong>{otherPartyName}</strong> · {otherPartySubtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px 8px',
                lineHeight: 1,
              }}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="chat-messages-area">
          <div className="chat-date-separator">
            <span>Direct SpaceShare Secure Chat</span>
          </div>

          {messages.map((msg, idx) => {
            const isMe = msg.sender_role === currentUserRole
            return (
              <div
                key={msg.id || idx}
                className={`chat-bubble-row ${isMe ? 'from-me' : 'from-other'}`}
              >
                {!isMe && (
                  <div className="chat-sender-avatar">
                    {msg.sender_role === 'owner' ? '🏛️' : '👤'}
                  </div>
                )}
                <div className="chat-bubble-content">
                  <span className="chat-sender-label">
                    {msg.sender_name} {msg.sender_role === 'owner' ? '· Host' : ''}
                  </span>
                  <div className="chat-bubble">
                    {msg.content}
                  </div>
                  <div className="chat-bubble-meta">
                    <span>{formatMsgTime(msg.created_at)}</span>
                    {isMe && <span>✓✓</span>}
                  </div>
                </div>
              </div>
            )
          })}

          {isOtherTyping && (
            <div className="chat-bubble-row from-other">
              <div className="chat-sender-avatar">{isGuest ? '🏛️' : '👤'}</div>
              <div className="chat-typing-row">
                <span>{otherPartyName} is typing</span>
                <div className="chat-typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips (for guest organizers) */}
        {isGuest && (
          <div className="chat-quick-chips">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip}
                type="button"
                className="chat-chip"
                onClick={() => handleSendMessage(undefined, chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form className="chat-modal-footer" onSubmit={handleSendMessage}>
          <textarea
            className="chat-input-field"
            rows={1}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder={
              isGuest
                ? `Message ${hostName.split(' ')[0]} about dates, catering or policies…`
                : `Reply to guest inquiry…`
            }
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputText.trim() || sending}
          >
            <span>{sending ? 'Sending…' : 'Send'}</span>
            <span>🚀</span>
          </button>
        </form>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 12, padding: '6px 16px', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  )
}
