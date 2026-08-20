const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spotrent_spaceshare',
  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_PORT: parseInt(process.env.PG_PORT, 10) || 5432,
  PG_USER: process.env.PG_USER || 'postgres',
  PG_PASSWORD: process.env.PG_PASSWORD || 'postgres',
  PG_DATABASE: process.env.PG_DATABASE || 'spotrent_spaceshare',
  JWT_SECRET: process.env.JWT_SECRET || 'spotrent_super_secret_jwt_key_2026',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'spotrent_super_secret_refresh_key_2026',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
