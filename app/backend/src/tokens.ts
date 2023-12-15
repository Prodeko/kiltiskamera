import crypto from "crypto";
import { VIEWER_TOKEN_VALIDITY_TTL } from "./configuration";
interface TokenInfo {
  id: string;
  displayName: string;
  timestamp: number;
}

interface ProdekoUser {
  id: string;
  email: string;
  displayName: string;
}

const onlineTokens: Record<string, TokenInfo> = {};

function generateRandomToken(): string {
  // Generate a random buffer
  const buffer = crypto.randomBytes(32);

  // Convert the buffer to a hexadecimal string
  const randomString = buffer.toString("hex");

  return randomString;
}

function addOnlineToken(user: ProdekoUser): string {
  const token = generateRandomToken();
  onlineTokens[token] = {
    id: user.id,
    displayName: user.displayName,
    timestamp: Date.now(),
  };
  return token;
}

function isTokenOnline(token: string): boolean {
  return !!onlineTokens[token];
}

function getOnlineTokens() {
  return onlineTokens;
}

function removeExpiredTokens(): void {
  const currentTime = Date.now();
  const expirationTime = VIEWER_TOKEN_VALIDITY_TTL;

  Object.keys(onlineTokens).forEach((token) => {
    const tokenInfo = onlineTokens[token];
    if (currentTime - tokenInfo.timestamp > expirationTime) {
      delete onlineTokens[token];
    }
  });

  // Schedule the next cleanup after the validity period
  setTimeout(removeExpiredTokens, expirationTime);
}

// Call the cleanup function to start the periodic cleanup
removeExpiredTokens();

// Export relevant functions and interfaces
export { ProdekoUser, addOnlineToken, isTokenOnline, getOnlineTokens };
