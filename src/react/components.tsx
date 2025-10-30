/**
 * SolenceAiPay SDK - React Components
 * Pre-built UI components for quick integration
 */

import React, { useState, useEffect } from 'react';
import { useSolenceAiPay } from './hooks';
import type { SolenceAiPayConfig, PaymentDetails } from '../types';

export interface SolenceAiPayProviderProps {
  config: SolenceAiPayConfig;
  children: React.ReactNode;
}

/**
 * Context for SolenceAiPay SDK
 */
const SolenceAiPayContext = React.createContext<ReturnType<typeof useSolenceAiPay> | null>(null);

export function SolenceAiPayProvider({ config, children }: SolenceAiPayProviderProps) {
  const solencePay = useSolenceAiPay({ config, autoCheckTokenGate: true });

  return (
    <SolenceAiPayContext.Provider value={solencePay}>
      {children}
    </SolenceAiPayContext.Provider>
  );
}

export function useSolenceAiPayContext() {
  const context = React.useContext(SolenceAiPayContext);
  if (!context) {
    throw new Error('useSolenceAiPayContext must be used within SolenceAiPayProvider');
  }
  return context;
}

/**
 * Payment Form Component
 */
export interface PaymentFormProps {
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function PaymentForm({ onSuccess, onError, className = '' }: PaymentFormProps) {
  const {
    securityCheck,
    performSecurityCheck,
    executePayment,
    paymentState,
    tokenGateStatus,
  } = useSolenceAiPayContext();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  // Auto security check on recipient change
  useEffect(() => {
    if (recipient && recipient.length >= 32) {
      const timer = setTimeout(() => {
        performSecurityCheck(recipient);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [recipient, performSecurityCheck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !amount) return;

    const details: PaymentDetails = {
      recipient,
      amount,
      memo: memo || undefined,
      securityScore: securityCheck.score || undefined,
      riskLevel: securityCheck.riskLevel || undefined,
    };

    const result = await executePayment(details);

    if (result.success && result.signature) {
      onSuccess?.(result.signature);
    } else {
      onError?.(result.error || 'Payment failed');
    }
  };

  const canSubmit =
    recipient &&
    amount &&
    parseFloat(amount) > 0 &&
    !securityCheck.checking &&
    paymentState === 'idle';

  return (
    <form onSubmit={handleSubmit} className={`solenceaipay-form ${className}`}>
      {/* Token Gate Banner */}
      {tokenGateStatus && (
        <div className={`token-gate-banner ${tokenGateStatus.hasAccess ? 'has-access' : 'no-access'}`}>
          {tokenGateStatus.hasAccess ? (
            <span>🎉 Unlimited API access</span>
          ) : (
            <span>
              {tokenGateStatus.remainingCalls} scans remaining
              {tokenGateStatus.isTokenHolder && ' • Hold more tokens for unlimited access'}
            </span>
          )}
        </div>
      )}

      {/* Recipient Input */}
      <div className="form-group">
        <label htmlFor="recipient">Recipient Address</label>
        <input
          id="recipient"
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Solana wallet address"
          disabled={paymentState !== 'idle'}
        />
      </div>

      {/* Security Check Display */}
      {securityCheck.checking && (
        <div className="security-check checking">
          <span className="spinner" />
          <span>Checking security...</span>
        </div>
      )}

      {!securityCheck.checking && securityCheck.score !== null && (
        <div
          className={`security-check ${
            securityCheck.hasBadge || securityCheck.riskLevel === 'LOW'
              ? 'safe'
              : securityCheck.riskLevel === 'MEDIUM'
              ? 'warning'
              : 'danger'
          }`}
        >
          <div className="security-header">
            <span className="security-icon">
              {securityCheck.hasBadge ? '✓' : securityCheck.riskLevel === 'LOW' ? '✓' : '⚠'}
            </span>
            <span className="security-score">Score: {securityCheck.score}/100</span>
          </div>
          {securityCheck.findings.length > 0 && (
            <ul className="security-findings">
              {securityCheck.findings.slice(0, 3).map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Amount Input */}
      <div className="form-group">
        <label htmlFor="amount">Amount (SOL)</label>
        <input
          id="amount"
          type="number"
          step="0.000001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={paymentState !== 'idle'}
        />
      </div>

      {/* Memo Input */}
      <div className="form-group">
        <label htmlFor="memo">Memo (Optional)</label>
        <input
          id="memo"
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Add a note"
          disabled={paymentState !== 'idle'}
          maxLength={100}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`submit-button ${
          securityCheck.score !== null && securityCheck.score < 75 ? 'risky' : 'safe'
        }`}
      >
        {paymentState === 'checking' && 'Checking Security...'}
        {paymentState === 'processing' && 'Processing Payment...'}
        {paymentState === 'idle' &&
          (securityCheck.score !== null && securityCheck.score < 75
            ? 'Send Risky Payment'
            : 'Send Secure Payment')}
        {paymentState === 'success' && 'Payment Sent!'}
        {paymentState === 'error' && 'Payment Failed'}
      </button>
    </form>
  );
}

/**
 * Security Badge Display Component
 */
export interface SecurityBadgeProps {
  walletAddress: string;
  className?: string;
}

export function SecurityBadge({ walletAddress, className = '' }: SecurityBadgeProps) {
  const { client } = useSolenceAiPayContext();
  const [hasBadge, setHasBadge] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkBadge = async () => {
      setChecking(true);
      try {
        const badge = await client.checkSafetyBadge(walletAddress);
        if (mounted) {
          setHasBadge(badge);
        }
      } catch (err) {
        console.error('Badge check failed:', err);
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    checkBadge();

    return () => {
      mounted = false;
    };
  }, [client, walletAddress]);

  if (checking) {
    return <div className={`security-badge checking ${className}`}>Checking...</div>;
  }

  if (!hasBadge) {
    return null;
  }

  return (
    <div className={`security-badge verified ${className}`}>
      <span className="badge-icon">✓</span>
      <span>Safety Badge Verified</span>
    </div>
  );
}

/**
 * Transaction History Component
 */
export interface TransactionHistoryProps {
  className?: string;
}

export function TransactionHistory({ className = '' }: TransactionHistoryProps) {
  const { transactions, fetchTransactions, loading } = useSolenceAiPayContext();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  if (loading) {
    return <div className={`transaction-history loading ${className}`}>Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return <div className={`transaction-history empty ${className}`}>No transactions yet</div>;
  }

  return (
    <div className={`transaction-history ${className}`}>
      <h3>Recent Transactions</h3>
      <ul className="transaction-list">
        {transactions.map((tx) => (
          <li key={tx._id} className={`transaction-item ${tx.type}`}>
            <div className="transaction-header">
              <span className="transaction-type">{tx.type === 'sent' ? '↑' : '↓'}</span>
              <span className="transaction-amount">
                {tx.type === 'sent' ? '-' : '+'}
                {tx.amount} SOL
              </span>
            </div>
            <div className="transaction-details">
              <span className="transaction-address">
                {tx.type === 'sent' ? 'To: ' : 'From: '}
                {(tx.type === 'sent' ? tx.recipient : tx.sender)?.slice(0, 8)}...
              </span>
              {tx.securityScore && (
                <span className="transaction-score">Score: {tx.securityScore}</span>
              )}
            </div>
            <div className="transaction-meta">
              <span className="transaction-date">{new Date(tx.timestamp).toLocaleDateString()}</span>
              <span className={`transaction-status ${tx.status}`}>{tx.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
