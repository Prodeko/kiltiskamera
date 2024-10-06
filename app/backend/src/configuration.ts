import * as dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

export const PORT = 8087;
export const VIEWER_TOKEN_VALIDITY_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
export const VIEWER_TOKEN_DESTROY_DELAY = 30 * 1000; // 30 seconds in milliseconds
// Chat properties
export const CHAT_MESSAGE_TTL = 1 * 60 * 1000; // 1 minute
export const CHAT_MAX_MESSAGES = 50;

// Analytics access restriction
export const ON_AIR_PASSWORD = process.env.ON_AIR_PASSWORD || "";

// Prodeko.org Oauth2 parameters
export const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID || "";
export const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET || "";
export const OAUTH2_CALLBACK_URL = process.env.OAUTH2_CALLBACK_URL || "";
export const OAUTH2_AUTH_URL = process.env.OAUTH2_AUTH_URL || "";
export const OAUTH2_TOKEN_URL = process.env.OAUTH2_TOKEN_URL || "";
export const OAUTH2_PROFILE_URL = process.env.OAUTH2_PROFILE_URL || "";

// Session storing properties
export const SESSION_SECRET = process.env.SESSION_SECRET || "";
