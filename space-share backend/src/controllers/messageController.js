const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/config');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const DATA_DIR = path.join(__dirname, '../data');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Initial Seed Data ──────────────────────────────────────────────────────

const INITIAL_CONVERSATIONS = [
  {
    id: 'conv_glasshouse_01',
    venue_id: '1',
    venue_title: 'The Glasshouse Estate',
    venue_city: 'New Delhi',
    venue_image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    user_id: 'user_default',
    user_name: 'Priya Sharma (Organizer)',
    owner_id: 'owner_rajesh',
    owner_name: 'Rajesh Verma (Host)',
    last_message: 'Namaste Priya! Yes, outside catering and live acoustic music are welcome until 10:30 PM.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    unread_user_count: 1,
    unread_owner_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: 'conv_haveli_02',
    venue_id: '2',
    venue_title: 'Royal Heritage Haveli',
    venue_city: 'Jaipur',
    venue_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    user_id: 'user_default',
    user_name: 'Priya Sharma (Organizer)',
    owner_id: 'owner_ananya',
    owner_name: 'Ananya Rathore (Host)',
    last_message: 'We have reserved the Courtyard for your walkthrough this Saturday at 3 PM.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    unread_user_count: 0,
    unread_owner_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

const INITIAL_MESSAGES = [
  {
    id: 'msg_001',
    conversation_id: 'conv_glasshouse_01',
    venue_id: '1',
    sender_role: 'user',
    sender_id: 'user_default',
    sender_name: 'Priya Sharma',
    recipient_role: 'owner',
    recipient_id: 'owner_rajesh',
    content: 'Hi Rajesh! We are planning a 150-guest engagement party next month. Are outside caterers and acoustic music permitted?',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'msg_002',
    conversation_id: 'conv_glasshouse_01',
    venue_id: '1',
    sender_role: 'owner',
    sender_id: 'owner_rajesh',
    sender_name: 'Rajesh Verma (Host)',
    recipient_role: 'user',
    recipient_id: 'user_default',
    content: 'Namaste Priya! Yes, outside catering and live acoustic music are welcome until 10:30 PM. We also offer 100% generator power backup and 60+ valet parking spots.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'msg_003',
    conversation_id: 'conv_haveli_02',
    venue_id: '2',
    sender_role: 'user',
    sender_id: 'user_default',
    sender_name: 'Priya Sharma',
    recipient_role: 'owner',
    recipient_id: 'owner_ananya',
    content: 'Can we schedule a venue tour this coming Saturday afternoon?',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
  },
  {
    id: 'msg_004',
    conversation_id: 'conv_haveli_02',
    venue_id: '2',
    sender_role: 'owner',
    sender_id: 'owner_ananya',
    sender_name: 'Ananya Rathore (Host)',
    recipient_role: 'user',
    recipient_id: 'user_default',
    content: 'We have reserved the Courtyard for your walkthrough this Saturday at 3 PM. Looking forward to welcoming you!',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_001',
    user_id: 'user_default',
    target_role: 'user',
    type: 'message',
    title: '💬 New Message from Host Rajesh',
    message: 'Rajesh Verma: "Namaste Priya! Yes, outside catering and live acoustic music are welcome until 10:30 PM."',
    venue_id: '1',
    venue_title: 'The Glasshouse Estate',
    conversation_id: 'conv_glasshouse_01',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'notif_002',
    user_id: 'user_default',
    target_role: 'user',
    type: 'booking',
    title: '🎉 Booking Confirmed',
    message: 'Your booking for Royal Heritage Haveli on 15th December has been confirmed by the host.',
    venue_id: '2',
    venue_title: 'Royal Heritage Haveli',
    conversation_id: 'conv_haveli_02',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'notif_003',
    user_id: 'owner_rajesh',
    target_role: 'owner',
    type: 'message',
    title: '💬 New Guest Inquiry for The Glasshouse Estate',
    message: 'Priya Sharma: "Hi Rajesh! We are planning a 150-guest engagement party next month..."',
    venue_id: '1',
    venue_title: 'The Glasshouse Estate',
    conversation_id: 'conv_glasshouse_01',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'notif_004',
    user_id: 'user_default',
    target_role: 'user',
    type: 'system',
    title: '🛡️ Verified Organizer Badge Active',
    message: 'Your identity and phone number verification is 100% complete. Enjoy priority instant bookings.',
    venue_id: null,
    venue_title: 'SpaceShare Safety',
    conversation_id: null,
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

// ─── Helpers for JSON File Store ───────────────────────────────────────────

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[MessageController] Failed to read ${file}, using default fallback:`, err.message);
    return fallback;
  }
}

function saveJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[MessageController] Failed to write ${file}:`, err.message);
  }
}

function getStoredConversations() {
  return loadJson(CONVERSATIONS_FILE, INITIAL_CONVERSATIONS);
}

function getStoredMessages() {
  return loadJson(MESSAGES_FILE, INITIAL_MESSAGES);
}

function getStoredNotifications() {
  return loadJson(NOTIFICATIONS_FILE, INITIAL_NOTIFICATIONS);
}

// ─── Smart Host Auto-Replies for Interactive Demo ──────────────────────────

const HOST_AUTO_REPLIES = [
  'Namaste! Thank you for reaching out. Yes, we are available on that date and would love to host your celebration! How many guests are you expecting?',
  'Hello! We can definitely accommodate your decor setup 3 hours prior to event start. Outside catering and DJ are welcome.',
  'Great question! We provide 100% silent generator backup, green rooms for bridal changes, and dedicated valet parking attendants.',
  'Thanks for your message! You are welcome to visit for a walkthrough any day between 11 AM and 6 PM. Let us know what time works best for you.',
  'We have noted your requirement! Our on-site manager will be dedicated to coordinating with your decorators and catering team.',
];

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * GET /api/messages/conversations
 * Get all conversations for current user or venue
 */
async function getConversations(req, res) {
  try {
    const userId = req.user?.id || req.query.user_id || 'user_default';
    const role = req.query.role || (req.user?.role === 'owner' ? 'owner' : 'user');
    const venueId = req.query.venue_id;

    let conversations = getStoredConversations();

    if (venueId) {
      conversations = conversations.filter(c => String(c.venue_id) === String(venueId));
    } else if (role === 'owner') {
      conversations = conversations.filter(c => c.owner_id === userId || c.owner_id === 'owner_rajesh');
    } else {
      conversations = conversations.filter(c => c.user_id === userId || c.user_id === 'user_default');
    }

    // Sort by latest message
    conversations.sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));

    return successResponse(res, { conversations }, 'Conversations retrieved successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to fetch conversations', 500, err.message);
  }
}

/**
 * GET /api/messages/conversations/:id
 * Get full message thread for a conversation or by venue_id
 */
async function getConversation(req, res) {
  try {
    const { id } = req.params;
    const conversations = getStoredConversations();
    const messages = getStoredMessages();

    // ID can be conversation_id OR venue_id
    let conv = conversations.find(c => c.id === id);
    if (!conv) {
      conv = conversations.find(c => String(c.venue_id) === String(id));
    }

    if (!conv) {
      return successResponse(res, {
        conversation: null,
        messages: [],
      }, 'No conversation started yet');
    }

    const threadMessages = messages
      .filter(m => m.conversation_id === conv.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return successResponse(res, {
      conversation: conv,
      messages: threadMessages,
    }, 'Conversation thread retrieved');
  } catch (err) {
    return errorResponse(res, 'Failed to retrieve conversation', 500, err.message);
  }
}

/**
 * POST /api/messages
 * Send a message (creates conversation if not exists, records message, creates notification for recipient)
 */
async function sendMessage(req, res) {
  try {
    const {
      conversation_id,
      venue_id,
      venue_title = 'Event Venue',
      venue_image,
      content,
      sender_role = 'user', // 'user' | 'owner'
      sender_name,
      sender_id,
      auto_reply = true,
    } = req.body;

    if (!content || !content.trim()) {
      return errorResponse(res, 'Message content is required', 400);
    }

    const cleanContent = content.trim();
    const effectiveSenderId = sender_id || req.user?.id || (sender_role === 'owner' ? 'owner_rajesh' : 'user_default');
    const effectiveSenderName = sender_name || req.user?.profile?.full_name || (sender_role === 'owner' ? 'Rajesh Verma (Host)' : 'Priya Sharma (Organizer)');
    const recipientRole = sender_role === 'owner' ? 'user' : 'owner';
    const recipientId = sender_role === 'owner' ? 'user_default' : 'owner_rajesh';

    const conversations = getStoredConversations();
    const messages = getStoredMessages();
    const notifications = getStoredNotifications();

    let conv = conversations.find(c => c.id === conversation_id);
    if (!conv && venue_id) {
      conv = conversations.find(c => String(c.venue_id) === String(venue_id));
    }

    const now = new Date().toISOString();

    if (!conv) {
      // Create new conversation
      conv = {
        id: conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        venue_id: String(venue_id || '1'),
        venue_title: venue_title,
        venue_city: req.body.venue_city || 'New Delhi',
        venue_image: venue_image || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
        user_id: sender_role === 'user' ? effectiveSenderId : 'user_default',
        user_name: sender_role === 'user' ? effectiveSenderName : 'Priya Sharma (Organizer)',
        owner_id: sender_role === 'owner' ? effectiveSenderId : 'owner_rajesh',
        owner_name: sender_role === 'owner' ? effectiveSenderName : 'Rajesh Verma (Host)',
        last_message: cleanContent,
        last_message_at: now,
        unread_user_count: sender_role === 'owner' ? 1 : 0,
        unread_owner_count: sender_role === 'user' ? 1 : 0,
        created_at: now,
      };
      conversations.unshift(conv);
    } else {
      conv.last_message = cleanContent;
      conv.last_message_at = now;
      if (sender_role === 'user') {
        conv.unread_owner_count = (conv.unread_owner_count || 0) + 1;
      } else {
        conv.unread_user_count = (conv.unread_user_count || 0) + 1;
      }
    }

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      conversation_id: conv.id,
      venue_id: conv.venue_id,
      sender_role,
      sender_id: effectiveSenderId,
      sender_name: effectiveSenderName,
      recipient_role: recipientRole,
      recipient_id: recipientId,
      content: cleanContent,
      read: false,
      created_at: now,
    };
    messages.push(newMsg);

    // Create Notification for the Recipient
    const notifTitle = sender_role === 'user'
      ? `💬 New Guest Inquiry for ${conv.venue_title}`
      : `💬 Message from Host ${conv.owner_name}`;

    const notifSnippet = `${effectiveSenderName}: "${cleanContent.length > 80 ? cleanContent.substring(0, 77) + '...' : cleanContent}"`;

    const newNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: recipientId,
      target_role: recipientRole,
      type: 'message',
      title: notifTitle,
      message: notifSnippet,
      venue_id: conv.venue_id,
      venue_title: conv.venue_title,
      conversation_id: conv.id,
      read: false,
      created_at: now,
    };
    notifications.unshift(newNotification);

    // Save state
    saveJson(CONVERSATIONS_FILE, conversations);
    saveJson(MESSAGES_FILE, messages);
    saveJson(NOTIFICATIONS_FILE, notifications);

    let hostReplyMsg = null;
    let hostNotification = null;

    // Optional simulated smart host auto-response when user messages
    if (auto_reply && sender_role === 'user') {
      const replyText = HOST_AUTO_REPLIES[Math.floor(Math.random() * HOST_AUTO_REPLIES.length)];
      const replyTime = new Date(Date.now() + 1200).toISOString();

      hostReplyMsg = {
        id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 6)}`,
        conversation_id: conv.id,
        venue_id: conv.venue_id,
        sender_role: 'owner',
        sender_id: conv.owner_id || 'owner_rajesh',
        sender_name: conv.owner_name || 'Rajesh Verma (Host)',
        recipient_role: 'user',
        recipient_id: effectiveSenderId,
        content: replyText,
        read: false,
        created_at: replyTime,
      };
      messages.push(hostReplyMsg);

      conv.last_message = replyText;
      conv.last_message_at = replyTime;
      conv.unread_user_count = (conv.unread_user_count || 0) + 1;

      hostNotification = {
        id: `notif_${Date.now() + 1}_${Math.random().toString(36).substr(2, 6)}`,
        user_id: effectiveSenderId,
        target_role: 'user',
        type: 'message',
        title: `💬 Host Reply from ${conv.owner_name}`,
        message: `${conv.owner_name}: "${replyText}"`,
        venue_id: conv.venue_id,
        venue_title: conv.venue_title,
        conversation_id: conv.id,
        read: false,
        created_at: replyTime,
      };
      notifications.unshift(hostNotification);

      saveJson(CONVERSATIONS_FILE, conversations);
      saveJson(MESSAGES_FILE, messages);
      saveJson(NOTIFICATIONS_FILE, notifications);
    }

    return successResponse(res, {
      message: newMsg,
      conversation: conv,
      notification: newNotification,
      host_reply: hostReplyMsg,
      host_notification: hostNotification,
    }, 'Message sent and notifications delivered successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to send message', 500, err.message);
  }
}

/**
 * GET /api/notifications
 * List notifications with unread counts
 */
async function getNotifications(req, res) {
  try {
    const userId = req.user?.id || req.query.user_id || 'user_default';
    const role = req.query.role || (req.user?.role === 'owner' ? 'owner' : 'all');

    let notifications = getStoredNotifications();

    if (role !== 'all') {
      notifications = notifications.filter(n => n.target_role === role || n.target_role === 'all' || n.user_id === userId);
    }

    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const unreadCount = notifications.filter(n => !n.read).length;

    return successResponse(res, {
      notifications,
      unread_count: unreadCount,
    }, 'Notifications retrieved');
  } catch (err) {
    return errorResponse(res, 'Failed to retrieve notifications', 500, err.message);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const notifications = getStoredNotifications();
    const target = notifications.find(n => n.id === id);

    if (target) {
      target.read = true;
      saveJson(NOTIFICATIONS_FILE, notifications);
    }

    const unreadCount = notifications.filter(n => !n.read).length;
    return successResponse(res, { notification: target, unread_count: unreadCount }, 'Notification marked as read');
  } catch (err) {
    return errorResponse(res, 'Failed to update notification', 500, err.message);
  }
}

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
async function markAllNotificationsRead(req, res) {
  try {
    const notifications = getStoredNotifications();
    notifications.forEach(n => { n.read = true; });
    saveJson(NOTIFICATIONS_FILE, notifications);

    return successResponse(res, { unread_count: 0 }, 'All notifications marked as read');
  } catch (err) {
    return errorResponse(res, 'Failed to clear unread notifications', 500, err.message);
  }
}

module.exports = {
  getConversations,
  getConversation,
  sendMessage,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
