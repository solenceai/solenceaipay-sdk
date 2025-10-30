/**
 * SolenceAiPay SDK - Core Client
 * Main SDK class for integrating AI-powered secure payments
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  SolenceAiPayConfig,
  SecurityCheck,
  PaymentDetails,
  PaymentResult,
  SecurityVerificationResult,
  ScanResult,
  TokenGateStatus,
  TransactionLog,
  SDKEvent,
  SDKEventHandler,
  PaymentExecutionOptions,
  PaymentStatus,
} from './types';
import { z } from 'zod';

const DEFAULT_CONFIG: Partial<SolenceAiPayConfig> = {
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  securityThreshold: 75,
  rateLimitPerDay: 100,
  autoRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  debug: false,
};

export class SolenceAiPayClient {
  private config: Required<SolenceAiPayConfig>;
  private connection: Connection;
  private eventHandlers: Map<string, SDKEventHandler[]> = new Map();

  constructor(config: SolenceAiPayConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<SolenceAiPayConfig>;
    this.connection = new Connection(this.config.rpcUrl, 'confirmed');
    
    if (this.config.debug) {
      this.log('SDK initialized', { config: this.config });
    }
  }

  /**
   * Event System
   */
  on(eventType: string, handler: SDKEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: SDKEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: SDKEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
    if (this.config.debug) {
      this.log('Event emitted', event);
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[SolenceAiPay]', ...args);
    }
  }

  /**
   * Token Gate - Check if user has unlimited access
   */
  async checkTokenGate(walletAddress: string): Promise<TokenGateStatus> {
    if (!this.config.tokenMintAddress || !this.config.minTokenBalance) {
      return {
        hasAccess: false,
        tokenBalance: 0,
        requiredBalance: 0,
        isTokenHolder: false,
      };
    }

    try {
      const publicKey = new PublicKey(walletAddress);
      const tokenMint = new PublicKey(this.config.tokenMintAddress);

      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: tokenMint }
      );

      let totalBalance = 0;
      for (const account of tokenAccounts.value) {
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        totalBalance += balance;
      }

      const hasAccess = totalBalance >= this.config.minTokenBalance;
      const isTokenHolder = totalBalance > 0;

      this.emit({
        type: 'token_gate_checked',
        timestamp: Date.now(),
        data: { walletAddress, hasAccess, tokenBalance: totalBalance },
      });

      return {
        hasAccess,
        tokenBalance: totalBalance,
        requiredBalance: this.config.minTokenBalance,
        isTokenHolder,
        remainingCalls: hasAccess ? undefined : this.config.rateLimitPerDay,
      };
    } catch (error) {
      this.log('Token gate check failed', error);
      return {
        hasAccess: false,
        tokenBalance: 0,
        requiredBalance: this.config.minTokenBalance,
        isTokenHolder: false,
      };
    }
  }

  /**
   * Check if wallet has Safety Badge (on-chain verification)
   */
  async checkSafetyBadge(walletAddress: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/badge/check?wallet=${walletAddress}`, {
        method: 'GET',
      });

      if (!response.ok) return false;
      const data = await response.json();
      return data.onChainBadge === true;
    } catch (error) {
      this.log('Badge check failed', error);
      return false;
    }
  }

  /**
   * Perform comprehensive security scan on recipient wallet
   */
  async verifyRecipientSecurity(
    recipientAddress: string,
    viewerWallet?: string
  ): Promise<SecurityVerificationResult> {
    this.emit({
      type: 'security_check_started',
      timestamp: Date.now(),
      data: { recipientAddress },
    });

    try {
      // Check for Safety Badge first (instant approval)
      const hasBadge = await this.checkSafetyBadge(recipientAddress);

      if (hasBadge) {
        const result: SecurityVerificationResult = {
          passed: true,
          score: this.config.securityThreshold,
          hasBadge: true,
          findings: [
            '✓ Verified Safety Badge holder',
            '✓ Wallet passed security audit',
            '✓ Safe to proceed',
          ],
          riskLevel: 'LOW',
        };

        this.emit({
          type: 'security_check_completed',
          timestamp: Date.now(),
          data: result,
        });

        return result;
      }

      // Perform live security scan
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (viewerWallet) {
        headers['x-viewer-wallet'] = viewerWallet;
      }

      const response = await this.makeRequest('/scan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          wallet: recipientAddress,
          isPublic: false,
          skipPayment: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Security scan failed');
      }

      const scanData: ScanResult = await response.json();

      const result: SecurityVerificationResult = {
        passed: scanData.score >= this.config.securityThreshold,
        score: scanData.score,
        hasBadge: false,
        findings: scanData.findings || [],
        riskLevel: scanData.riskLevel,
      };

      this.emit({
        type: 'security_check_completed',
        timestamp: Date.now(),
        data: result,
      });

      return result;
    } catch (error) {
      this.log('Security verification failed', error);

      // Fail-safe: if security check fails, treat as risky
      const result: SecurityVerificationResult = {
        passed: false,
        score: null,
        hasBadge: false,
        findings: ['⚠ Security verification unavailable', '⚠ Cannot verify wallet safety'],
        riskLevel: 'HIGH',
      };

      this.emit({
        type: 'security_check_completed',
        timestamp: Date.now(),
        data: { ...result, error: (error as Error).message },
      });

      return result;
    }
  }

  /**
   * Build transaction for payment
   */
  async buildPaymentTransaction(
    senderPublicKey: PublicKey,
    recipientAddress: string,
    amountInSol: number
  ): Promise<{ transaction: Transaction; blockhash: string; lastValidBlockHeight: number }> {
    const recipientPubkey = new PublicKey(recipientAddress);
    const lamports = Math.floor(amountInSol * LAMPORTS_PER_SOL);

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderPublicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    return { transaction, blockhash, lastValidBlockHeight };
  }

  /**
   * Execute secure payment with AI verification
   */
  async executePayment(
    senderPublicKey: PublicKey,
    signTransaction: (transaction: Transaction) => Promise<Transaction>,
    paymentDetails: PaymentDetails,
    options: PaymentExecutionOptions = {}
  ): Promise<PaymentResult> {
    try {
      // Security check
      if (!options.skipSecurityCheck) {
        options.onProgress?.('checking');
        const securityCheck = await this.verifyRecipientSecurity(
          paymentDetails.recipient,
          senderPublicKey.toBase58()
        );

        options.onSecurityCheck?.(this.convertToSecurityCheck(securityCheck));

        if (!securityCheck.passed && !options.forcePayment) {
          return {
            success: false,
            error: 'Security check failed. Set forcePayment=true to override.',
            securityCheckPassed: false,
          };
        }
      }

      // Build transaction
      options.onProgress?.('processing');
      this.emit({
        type: 'payment_initiated',
        timestamp: Date.now(),
        data: paymentDetails,
      });

      const { transaction, blockhash, lastValidBlockHeight } = await this.buildPaymentTransaction(
        senderPublicKey,
        paymentDetails.recipient,
        parseFloat(paymentDetails.amount)
      );

      // Sign transaction
      const signedTransaction = await signTransaction(transaction);

      // Send and confirm
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: this.config.maxRetries,
      });

      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      const result: PaymentResult = {
        success: true,
        signature,
        securityCheckPassed: true,
      };

      this.emit({
        type: 'payment_confirmed',
        timestamp: Date.now(),
        data: result,
      });

      options.onSuccess?.(result);

      // Log payment
      await this.logPayment({
        sender: senderPublicKey.toBase58(),
        recipient: paymentDetails.recipient,
        amount: paymentDetails.amount,
        success: true,
        transactionSignature: signature,
        securityScore: paymentDetails.securityScore,
        riskLevel: paymentDetails.riskLevel,
      });

      return result;
    } catch (error) {
      const errorResult: PaymentResult = {
        success: false,
        error: (error as Error).message,
        securityCheckPassed: false,
      };

      this.emit({
        type: 'payment_failed',
        timestamp: Date.now(),
        data: errorResult,
      });

      options.onError?.(error as Error);

      return errorResult;
    }
  }

  /**
   * Get transaction history for wallet
   */
  async getTransactionHistory(walletAddress: string): Promise<TransactionLog[]> {
    try {
      const response = await this.makeRequest(`/transactions?wallet=${walletAddress}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      this.log('Failed to fetch transaction history', error);
      return [];
    }
  }

  /**
   * Log payment attempt
   */
  private async logPayment(data: {
    sender: string;
    recipient: string;
    amount: string;
    success: boolean;
    transactionSignature?: string;
    errorMessage?: string;
    securityScore?: number;
    riskLevel?: string;
  }): Promise<void> {
    try {
      await this.makeRequest('/payments/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          metadata: {
            sdkVersion: '1.0.0',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
          },
        }),
      });
    } catch (error) {
      this.log('Failed to log payment', error);
    }
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.apiEndpoint}${endpoint}`;
    const headers = {
      ...options.headers,
      ...this.config.customHeaders,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 429) {
          this.emit({
            type: 'rate_limit_exceeded',
            timestamp: Date.now(),
            data: { endpoint },
          });
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries - 1 && this.config.autoRetry) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Helper to convert SecurityVerificationResult to SecurityCheck
   */
  private convertToSecurityCheck(result: SecurityVerificationResult): SecurityCheck {
    return {
      hasBadge: result.hasBadge,
      score: result.score,
      riskLevel: result.riskLevel,
      findings: result.findings,
      checking: false,
      error: null,
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const lamports = await this.connection.getBalance(publicKey);
      return lamports / LAMPORTS_PER_SOL;
    } catch (error) {
      this.log('Failed to get balance', error);
      return 0;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SolenceAiPayConfig>): void {
    this.config = { ...this.config, ...newConfig } as Required<SolenceAiPayConfig>;
    
    if (newConfig.rpcUrl) {
      this.connection = new Connection(newConfig.rpcUrl, 'confirmed');
    }
  }
}
