const app = require('./src/app');
const config = require('./src/config/config');
const { connectDB } = require('./src/config/db');

const startServer = async () => {
  await connectDB();

  const server = app.listen(config.PORT, () => {
    console.log(`[Server] SpotRent backend running on http://localhost:${config.PORT} in ${config.NODE_ENV} mode`);
  });

  process.on('unhandledRejection', (err) => {
    console.error(`[Server Error] ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
