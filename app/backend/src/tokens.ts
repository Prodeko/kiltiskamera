import * as crypto from "crypto";
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

function removeOnlineToken(user: ProdekoUser): void {
  for (const token in onlineTokens) {
    if (onlineTokens[token].id === user.id) {
      delete onlineTokens[token];
      break;
    }
  }
}
function isTokenOnline(token: string): boolean {
  return !!onlineTokens[token];
}

function getOnlineTokens() {
  return onlineTokens;
}

// Tokens within their validity TTL. The periodic cleanup below only runs once
// per TTL, so expired tokens can still be in the map for a while.
function countValidTokens(): number {
  const currentTime = Date.now();
  let count = 0;
  Object.keys(onlineTokens).forEach((token) => {
    if (currentTime - onlineTokens[token].timestamp <= VIEWER_TOKEN_VALIDITY_TTL) {
      count += 1;
    }
  });
  return count;
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
export {
  ProdekoUser,
  addOnlineToken,
  removeOnlineToken,
  isTokenOnline,
  getOnlineTokens,
  countValidTokens,
};
