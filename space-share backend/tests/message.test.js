const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const messageRoutes = require('../src/routes/messageRoutes');
const notificationRoutes = require('../src/routes/notificationRoutes');

const app = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Helper for test requests
async function mockRequest(handler, { method = 'GET', url = '/', body = {}, params = {}, query = {}, headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url,
      body,
      params,
      query,
      headers,
      get: (header) => headers[header.toLowerCase()],
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
      json(data) {
        resolve({ status: this.statusCode, body: data });
      },
    };
    try {
      handler(req, res, (err) => {
        if (err) reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

const messageController = require('../src/controllers/messageController');

describe('Messaging & Notifications Unit Tests', () => {
  test('1. Retrieve seeded conversations', async () => {
    const res = await mockRequest(messageController.getConversations, {
      method: 'GET',
      query: { role: 'user' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.conversations));
    assert.ok(res.body.data.conversations.length >= 1);
  });

  test('2. Retrieve conversation thread by ID', async () => {
    const res = await mockRequest(messageController.getConversation, {
      method: 'GET',
      params: { id: 'conv_glasshouse_01' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.conversation);
    assert.ok(Array.isArray(res.body.data.messages));
    assert.ok(res.body.data.messages.length >= 1);
  });

  test('3. Send message from user to host with automatic notification generation', async () => {
    const res = await mockRequest(messageController.sendMessage, {
      method: 'POST',
      body: {
        venue_id: '1',
        venue_title: 'The Glasshouse Estate',
        content: 'Is valet parking available for 80 cars?',
        sender_role: 'user',
        sender_name: 'Aditi Rao',
        auto_reply: true,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.message);
    assert.equal(res.body.data.message.content, 'Is valet parking available for 80 cars?');
    assert.ok(res.body.data.notification);
    assert.equal(res.body.data.notification.target_role, 'owner');
    // Check auto reply and host notification
    assert.ok(res.body.data.host_reply);
    assert.ok(res.body.data.host_notification);
    assert.equal(res.body.data.host_notification.target_role, 'user');
  });

  test('4. Fetch notifications and check unread count', async () => {
    const res = await mockRequest(messageController.getNotifications, {
      method: 'GET',
      query: { role: 'all' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.notifications));
    assert.ok(typeof res.body.data.unread_count === 'number');
  });

  test('5. Mark notification as read', async () => {
    const fetchRes = await mockRequest(messageController.getNotifications, {
      method: 'GET',
      query: { role: 'all' },
    });
    const firstNotif = fetchRes.body.data.notifications[0];
    assert.ok(firstNotif);

    const markRes = await mockRequest(messageController.markNotificationRead, {
      method: 'PATCH',
      params: { id: firstNotif.id },
    });

    assert.equal(markRes.status, 200);
    assert.equal(markRes.body.success, true);
    assert.equal(markRes.body.data.notification.read, true);
  });
});
