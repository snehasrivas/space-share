/**
 * Space Share Backend Server
 * Fully updated for seamless frontend connection
 */

const app = require('./src/app');
const { config } = require('./src/config/config');

const PORT = config.port || 5000;

// Start Server
const server = app.listen(PORT, () => {
  console.log('--------------------------------------------------');
  console.log('🚀 Space Share Backend Server is Live!');
  console.log(`📡 Port:   ${PORT}`);
  console.log(`🛠️ Mode:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
  console.log('--------------------------------------------------');
});

// Graceful Shutdown for safe exit
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down server gracefully...`);
  server.close(() => {
    console.log('Server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Error handlers
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection Details:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception Details:', err);
    process.exit(1);
});

module.exports = server;
