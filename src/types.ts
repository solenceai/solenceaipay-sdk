/**
 * SolenceAiPay SDK - Core Types
 * AI-powered secure payment infrastructure for Solana
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type PaymentStatus = "idle" | "checking" | "confirming" | "processing" | "success" | "error";

export interface SecurityCheck {
  hasBadge: boolean;
  score: number | null;
  riskLevel: RiskLevel | null;
  findings: string[];
  checking: boolean;
  error: string | null;
}

export interface WalletDetails {
  solBalance: number | null;
  tokenCount: number | null;
  nftCount: number | null;
  txCount: number | null;
  accountAgeDays: number | null;
  lastActivity: string | null;
  firstActivity: string | null;
}

export interface PaymentDetails {
  amount: string;
  recipient: string;
  memo?: string;
  securityScore?: number;
  riskLevel?: RiskLevel;
}

export interface PaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
  securityCheckPassed: boolean;
  paymentBypassed?: boolean;
}

export interface ScanResult {
  _id: string;
  wallet: string;
  score: number;
  riskLevel: RiskLevel;
  findings: string[];
  aiSummary: string;
  walletDetails: WalletDetails;
  createdAt: string;
  meta: {
    createdByWallet: string | null;
    isPublic: boolean;
  };
}

export interface TransactionLog {
  _id: string;
  signature: string;
  type: "sent" | "received";
  amount: number;
  recipient?: string;
  sender?: string;
  timestamp: string;
  status: "success" | "pending" | "failed";
  securityScore?: number;
  memo?: string;
}

export interface SolenceAiPayConfig {
  /**
   * Your SolenceAI API endpoint
   * Default: https://solenceai.com/api
   */
  apiEndpoint: string;

  /**
   * Solana RPC URL
   * Default: https://api.mainnet-beta.solana.com
   */
  rpcUrl?: string;

  /**
   * Security score threshold for warnings (0-100)
   * Default: 75
   */
  securityThreshold?: number;

  /**
   * Token mint address for gated access
   * If user holds this token, they get unlimited API calls
   */
  tokenMintAddress?: string;

  /**
   * Minimum token balance required for unlimited access
   * Default: 5000000 (5M tokens)
   */
  minTokenBalance?: number;

  /**
   * API rate limit for non-token holders
   * Default: 100 requests per day
   */
  rateLimitPerDay?: number;

  /**
   * Enable automatic retry on network errors
   * Default: true
   */
  autoRetry?: boolean;

  /**
   * Maximum number of retries
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds
   * Default: 1000
   */
  retryDelay?: number;

  /**
   * Enable debug logging
   * Default: false
   */
  debug?: boolean;

  /**
   * Custom headers to include in API requests
   */
  customHeaders?: Record<string, string>;
}

export interface TokenGateStatus {
  hasAccess: boolean;
  tokenBalance: number;
  requiredBalance: number;
  isTokenHolder: boolean;
  remainingCalls?: number;
}

export interface PaymentExecutionOptions {
  /**
   * Skip security check (not recommended)
   * Default: false
   */
  skipSecurityCheck?: boolean;

  /**
   * Force payment even if risky
   * Default: false
   */
  forcePayment?: boolean;

  /**
   * Custom memo for the transaction
   */
  memo?: string;

  /**
   * Callback for security check results
   */
  onSecurityCheck?: (check: SecurityCheck) => void;

  /**
   * Callback for payment progress
   */
  onProgress?: (status: PaymentStatus) => void;

  /**
   * Callback for payment success
   */
  onSuccess?: (result: PaymentResult) => void;

  /**
   * Callback for payment error
   */
  onError?: (error: Error) => void;
}

export interface SecurityVerificationResult {
  passed: boolean;
  score: number | null;
  hasBadge: boolean;
  findings: string[];
  riskLevel: RiskLevel | null;
}

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export type SDKEventType = 
  | "security_check_started"
  | "security_check_completed"
  | "payment_initiated"
  | "payment_confirmed"
  | "payment_failed"
  | "token_gate_checked"
  | "rate_limit_exceeded";

export interface SDKEvent {
  type: SDKEventType;
  timestamp: number;
  data?: any;
}

export type SDKEventHandler = (event: SDKEvent) => void;
