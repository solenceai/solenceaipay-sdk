/**
 * SolenceAiPay SDK - Utility Functions
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Validate a Solana address
 */
export function validateSolanaAddress(address: string): boolean {
  try {
    const pk = new PublicKey(address.trim());
    return pk.toBase58() === address.trim();
  } catch {
    return false;
  }
}

/**
 * Format SOL amount with proper decimals
 */
export function formatAmount(amount: number, decimals: number = 4): string {
  return amount.toFixed(decimals);
}

/**
 * Format Solana address for display (truncated)
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Calculate transaction fee estimate
 */
export function estimateFee(): number {
  return 0.000005; // 5000 lamports
}

/**
 * Check if error is a user rejection
 */
export function isUserRejection(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('user rejected') || message.includes('user cancelled');
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Parse amount string to number safely
 */
export function parseAmount(amountStr: string): number | null {
  const num = parseFloat(amountStr);
  if (isNaN(num) || num <= 0) {
    return null;
  }
  return num;
}

/**
 * Format timestamp to human-readable string
 */
export function formatTimestamp(timestamp: string | number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 24) {
    return 'Today';
  } else if (diffInDays < 2) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${Math.floor(diffInDays)} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW':
      return '#10b981'; // green
    case 'MEDIUM':
      return '#f59e0b'; // orange
    case 'HIGH':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Get risk level emoji
 */
export function getRiskLevelEmoji(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW':
      return '✓';
    case 'MEDIUM':
      return '⚠';
    case 'HIGH':
      return '⚠';
    default:
      return '?';
  }
}
