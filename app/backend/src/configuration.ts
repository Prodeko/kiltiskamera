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

// Keycloak OpenID Connect parameters. The issuer must not end with a slash;
// every endpoint is read from its discovery document at startup.
export const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER || "";
export const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "";
export const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || "";
export const KEYCLOAK_CALLBACK_URL = process.env.KEYCLOAK_CALLBACK_URL || "";

// The realm role a member must hold to watch the stream. Keycloak is the sole
// authority on this: the realm also contains people who are not members.
export const KEYCLOAK_REQUIRED_ROLE = "membership";

// Session storing properties
export const SESSION_SECRET = process.env.SESSION_SECRET || "";
