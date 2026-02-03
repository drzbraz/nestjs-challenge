import * as dotenv from 'dotenv';

dotenv.config();

export const AppConfig = {
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/records',
  port: process.env.PORT || 3000,
};
