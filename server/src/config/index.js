import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: process.env.PORT || 3001,
  FIRMS_API_KEY: process.env.FIRMS_API_KEY || '',
  ORS_API_KEY: process.env.ORS_API_KEY || '',
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes cache TTL
};
