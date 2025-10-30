/**
 * SolenceAiPay SDK - React Hooks
 * Easy-to-use React hooks for payment integration
 */

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SolenceAiPayClient } from '../client';
import {
  SecurityCheck,
  PaymentDetails,
  PaymentResult,
  PaymentStatus,
  TokenGateStatus,
  TransactionLog,
  SolenceAiPayConfig,
} from '../types';

export interface UseSolenceAiPayOptions {
  config: SolenceAiPayConfig;
  autoCheckTokenGate?: boolean;
}

export interface UseSolenceAiPayReturn {
  // Client instance
  client: SolenceAiPayClient;
  
  // Security check
  securityCheck: SecurityCheck;
  performSecurityCheck: (recipientAddress: string) => Promise<void>;
  resetSecurityCheck: () => void;
  
  // Payment execution
  paymentState: PaymentStatus;
  executePayment: (details: PaymentDetails) => Promise<PaymentResult>;
  resetPayment: () => void;
  
  // Token gate
  tokenGateStatus: TokenGateStatus | null;
  checkTokenGate: () => Promise<void>;
  
  // Transaction history
  transactions: TransactionLog[];
  fetchTransactions: () => Promise<void>;
  
  // Balance
  balance: number | null;
  fetchBalance: () => Promise<void>;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

/**
 * Main hook for SolenceAiPay integration
 */
export function useSolenceAiPay(options: UseSolenceAiPayOptions): UseSolenceAiPayReturn {
  const { publicKey, signTransaction, connected } = useWallet();
  const [client] = useState(() => new SolenceAiPayClient(options.config));
  
  const [securityCheck, setSecurityCheck] = useState<SecurityCheck>({
    hasBadge: false,
    score: null,
    riskLevel: null,
    findings: [],
    checking: false,
    error: null,
  });
  
  const [paymentState, setPaymentState] = useState<PaymentStatus>('idle');
  const [tokenGateStatus, setTokenGateStatus] = useState<TokenGateStatus | null>(null);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check token gate on wallet connection
   */
  const checkTokenGate = useCallback(async () => {
    if (!connected || !publicKey) {
      setTokenGateStatus(null);
      return;
    }

    try {
      const status = await client.checkTokenGate(publicKey.toBase58());
      setTokenGateStatus(status);
    } catch (err) {
      console.error('Token gate check failed:', err);
    }
  }, [client, publicKey, connected]);

  useEffect(() => {
    if (options.autoCheckTokenGate && connected && publicKey) {
      checkTokenGate();
    }
  }, [connected, publicKey, options.autoCheckTokenGate, checkTokenGate]);

  /**
   * Perform security check on recipient
   */
  const performSecurityCheck = useCallback(async (recipientAddress: string) => {
    if (!connected || !publicKey) {
      setError('Wallet not connected');
      return;
    }

    setSecurityCheck(prev => ({ ...prev, checking: true, error: null }));
    setError(null);

    try {
      const result = await client.verifyRecipientSecurity(
        recipientAddress,
        publicKey.toBase58()
      );

      setSecurityCheck({
        hasBadge: result.hasBadge,
        score: result.score,
        riskLevel: result.riskLevel,
        findings: result.findings,
        checking: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Security check failed';
      setSecurityCheck(prev => ({
        ...prev,
        checking: false,
        error: errorMessage,
      }));
      setError(errorMessage);
    }
  }, [client, publicKey, connected]);

  /**
   * Reset security check
   */
  const resetSecurityCheck = useCallback(() => {
    setSecurityCheck({
      hasBadge: false,
      score: null,
      riskLevel: null,
      findings: [],
      checking: false,
      error: null,
    });
  }, []);

  /**
   * Execute payment
   */
  const executePayment = useCallback(async (details: PaymentDetails): Promise<PaymentResult> => {
    if (!connected || !publicKey || !signTransaction) {
      const result: PaymentResult = {
        success: false,
        error: 'Wallet not connected',
        securityCheckPassed: false,
      };
      setError('Wallet not connected');
      return result;
    }

    setPaymentState('processing');
    setError(null);

    try {
      const result = await client.executePayment(
        publicKey,
        signTransaction,
        details,
        {
          onProgress: setPaymentState,
          onSecurityCheck: (check) => setSecurityCheck(check),
        }
      );

      if (result.success) {
        setPaymentState('success');
      } else {
        setPaymentState('error');
        setError(result.error || 'Payment failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setPaymentState('error');
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        securityCheckPassed: false,
      };
    }
  }, [client, publicKey, signTransaction, connected]);

  /**
   * Reset payment state
   */
  const resetPayment = useCallback(() => {
    setPaymentState('idle');
    setError(null);
  }, []);

  /**
   * Fetch transaction history
   */
  const fetchTransactions = useCallback(async () => {
    if (!connected || !publicKey) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    try {
      const txs = await client.getTransactionHistory(publicKey.toBase58());
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [client, publicKey, connected]);

  /**
   * Fetch wallet balance
   */
  const fetchBalance = useCallback(async () => {
    if (!connected || !publicKey) {
      setBalance(null);
      return;
    }

    try {
      const bal = await client.getBalance(publicKey.toBase58());
      setBalance(bal);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [client, publicKey, connected]);

  return {
    client,
    securityCheck,
    performSecurityCheck,
    resetSecurityCheck,
    paymentState,
    executePayment,
    resetPayment,
    tokenGateStatus,
    checkTokenGate,
    transactions,
    fetchTransactions,
    balance,
    fetchBalance,
    loading,
    error,
  };
}

/**
 * Simplified hook for security checks only
 */
export function useSecurityCheck(client: SolenceAiPayClient) {
  const { publicKey, connected } = useWallet();
  const [securityCheck, setSecurityCheck] = useState<SecurityCheck>({
    hasBadge: false,
    score: null,
    riskLevel: null,
    findings: [],
    checking: false,
    error: null,
  });

  const performCheck = useCallback(async (recipientAddress: string) => {
    if (!connected || !publicKey) return;

    setSecurityCheck(prev => ({ ...prev, checking: true, error: null }));

    try {
      const result = await client.verifyRecipientSecurity(
        recipientAddress,
        publicKey.toBase58()
      );

      setSecurityCheck({
        hasBadge: result.hasBadge,
        score: result.score,
        riskLevel: result.riskLevel,
        findings: result.findings,
        checking: false,
        error: null,
      });
    } catch (err) {
      setSecurityCheck(prev => ({
        ...prev,
        checking: false,
        error: err instanceof Error ? err.message : 'Security check failed',
      }));
    }
  }, [client, publicKey, connected]);

  const reset = useCallback(() => {
    setSecurityCheck({
      hasBadge: false,
      score: null,
      riskLevel: null,
      findings: [],
      checking: false,
      error: null,
    });
  }, []);

  return { securityCheck, performCheck, reset };
}

/**
 * Hook for token gate status
 */
export function useTokenGate(client: SolenceAiPayClient) {
  const { publicKey, connected } = useWallet();
  const [status, setStatus] = useState<TokenGateStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!connected || !publicKey) {
      setStatus(null);
      return;
    }

    setChecking(true);
    try {
      const tokenStatus = await client.checkTokenGate(publicKey.toBase58());
      setStatus(tokenStatus);
    } catch (err) {
      console.error('Token gate check failed:', err);
    } finally {
      setChecking(false);
    }
  }, [client, publicKey, connected]);

  useEffect(() => {
    if (connected && publicKey) {
      checkAccess();
    }
  }, [connected, publicKey, checkAccess]);

  return { status, checking, checkAccess };
}
