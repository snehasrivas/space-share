const app = require('./src/app');
const { config } = require('./src/config/config');

const PORT = config.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Space Share Backend Server Running      `);
  console.log(` Port: ${PORT}                            `);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'} `);
  console.log(` Health: http://localhost:${PORT}/api/health `);
  console.log(`=========================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection Details:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception Details:', err);
});

module.exports = server;
