# Next.js 13+ Integration Example

This example shows how to integrate SolenceAiPay SDK in a Next.js 13+ application with App Router.

## Setup

### 1. Install Dependencies

```bash
npm install @solenceai/payment-sdk @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### 2. Create Wallet Provider

```tsx
// app/providers/WalletProvider.tsx
'use client';

import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### 3. Create SolenceAiPay Provider

```tsx
// app/providers/SolenceAiPayProvider.tsx
'use client';

import { SolenceAiPayProvider } from '@solenceai/payment-sdk/react';

export function AppSolenceAiPayProvider({ children }: { children: React.ReactNode }) {
  return (
    <SolenceAiPayProvider
      config={{
        apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3000/api',
        rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
        tokenMintAddress: process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS,
        minTokenBalance: parseInt(process.env.NEXT_PUBLIC_MIN_TOKEN_BALANCE || '5000000'),
        securityThreshold: 75,
        debug: process.env.NODE_ENV === 'development',
      }}
    >
      {children}
    </SolenceAiPayProvider>
  );
}
```

### 4. Setup Root Layout

```tsx
// app/layout.tsx
import { SolanaWalletProvider } from './providers/WalletProvider';
import { AppSolenceAiPayProvider } from './providers/SolenceAiPayProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletProvider>
          <AppSolenceAiPayProvider>
            {children}
          </AppSolenceAiPayProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
```

### 5. Create Payment Page

```tsx
// app/payment/page.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolenceAiPayContext } from '@solenceai/payment-sdk/react';

export default function PaymentPage() {
  const { connected } = useWallet();
  const {
    securityCheck,
    performSecurityCheck,
    executePayment,
    paymentState,
    tokenGateStatus,
  } = useSolenceAiPayContext();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handlePayment = async () => {
    const result = await executePayment({
      recipient,
      amount,
      memo: 'Payment via SolenceAiPay',
    });

    if (result.success) {
      alert(`Payment successful! Signature: ${result.signature}`);
      setRecipient('');
      setAmount('');
    } else {
      alert(`Payment failed: ${result.error}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Secure Payment</h1>

      <div className="mb-6">
        <WalletMultiButton />
      </div>

      {!connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">Please connect your wallet to continue</p>
        </div>
      )}

      {connected && tokenGateStatus && (
        <div className={`border rounded-lg p-4 mb-6 ${
          tokenGateStatus.hasAccess ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
        }`}>
          {tokenGateStatus.hasAccess ? (
            <p className="text-green-800">🎉 You have unlimited API access</p>
          ) : (
            <p className="text-gray-800">
              {tokenGateStatus.remainingCalls} scans remaining today
              {tokenGateStatus.isTokenHolder && ' • Hold more tokens for unlimited access'}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              if (e.target.value.length >= 32) {
                performSecurityCheck(e.target.value);
              }
            }}
            placeholder="Solana wallet address"
            disabled={!connected || paymentState !== 'idle'}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        {securityCheck.checking && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">🔍 Checking security...</p>
          </div>
        )}

        {!securityCheck.checking && securityCheck.score !== null && (
          <div className={`border rounded-lg p-4 ${
            securityCheck.hasBadge || securityCheck.riskLevel === 'LOW'
              ? 'bg-green-50 border-green-200'
              : securityCheck.riskLevel === 'MEDIUM'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                {securityCheck.hasBadge ? '✓ Safety Badge Verified' : 'Security Scan'}
              </span>
              <span className="font-bold">{securityCheck.score}/100</span>
            </div>
            {securityCheck.findings.length > 0 && (
              <ul className="text-sm space-y-1">
                {securityCheck.findings.slice(0, 3).map((finding, idx) => (
                  <li key={idx}>• {finding}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Amount (SOL)</label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={!connected || paymentState !== 'idle'}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <button
          onClick={handlePayment}
          disabled={!connected || !recipient || !amount || paymentState !== 'idle'}
          className={`w-full py-3 px-4 rounded-lg font-semibold ${
            securityCheck.score !== null && securityCheck.score < 75
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:bg-gray-300 disabled:cursor-not-allowed`}
        >
          {paymentState === 'processing' && 'Processing Payment...'}
          {paymentState === 'idle' && (
            securityCheck.score !== null && securityCheck.score < 75
              ? 'Send Risky Payment'
              : 'Send Secure Payment'
          )}
        </button>
      </div>
    </div>
  );
}
```

### 6. Backend API Routes

```typescript
// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();
    const viewerWallet = req.headers.get('x-viewer-wallet');

    // Check token access
    const hasAccess = await checkTokenBalance(viewerWallet);

    if (!hasAccess) {
      // Check rate limit
      const canScan = await checkRateLimit(viewerWallet);
      if (!canScan) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    // Perform security scan (your logic here)
    const scanResult = await performSecurityScan(wallet);

    return NextResponse.json(scanResult);
  } catch (error) {
    return NextResponse.json(
      { error: 'Scan failed' },
      { status: 500 }
    );
  }
}

async function checkTokenBalance(wallet: string | null): Promise<boolean> {
  if (!wallet) return false;

  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const publicKey = new PublicKey(wallet);
    const tokenMint = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS!);

    const accounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { mint: tokenMint }
    );

    let totalBalance = 0;
    for (const account of accounts.value) {
      totalBalance += account.account.data.parsed.info.tokenAmount.uiAmount || 0;
    }

    return totalBalance >= parseInt(process.env.NEXT_PUBLIC_MIN_TOKEN_BALANCE!);
  } catch {
    return false;
  }
}

async function checkRateLimit(wallet: string | null): Promise<boolean> {
  // Implement your rate limiting logic
  // Example: Check Redis/DB for daily scan count
  return true;
}

async function performSecurityScan(wallet: string) {
  // Your security scan logic here
  return {
    score: 85,
    riskLevel: 'LOW',
    findings: ['No suspicious activity detected'],
  };
}
```

## Environment Variables

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3000/api
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_TOKEN_MINT_ADDRESS=YOUR_TOKEN_MINT
NEXT_PUBLIC_MIN_TOKEN_BALANCE=5000000
MONGODB_URI=your_mongodb_uri
```

## Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000/payment` to test the integration.

## Production Considerations

1. **Use secure RPC endpoints** (Helius, QuickNode, etc.)
2. **Implement proper rate limiting** using Redis
3. **Add error boundaries** for better error handling
4. **Use env variables** for all sensitive data
5. **Add analytics** to track payment flows
6. **Implement logging** for debugging
