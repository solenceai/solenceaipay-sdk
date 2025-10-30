# Migration Guide

This guide helps you migrate your existing SolenceAiPay code to use the SDK.

## Overview

The SDK provides a cleaner, more maintainable way to integrate SolenceAiPay into your application. Here's how to migrate from your current implementation.

## Step 1: Install the SDK

```bash
npm install @solenceai/payment-sdk
```

## Step 2: Replace Client-Side Code

### Before (Your Current Implementation)

```typescript
// Old: Directly calling API routes
const response = await fetch('/api/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet: recipient }),
});
const scanData = await response.json();
```

### After (Using SDK)

```typescript
// New: Using SDK client
import { SolenceAiPayClient } from '@solenceai/payment-sdk';

const client = new SolenceAiPayClient({
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT!,
  tokenMintAddress: process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS,
  minTokenBalance: parseInt(process.env.NEXT_PUBLIC_MIN_TOKEN_BALANCE!),
});

const securityCheck = await client.verifyRecipientSecurity(recipient, viewerWallet);
```

## Step 3: Replace Payment Execution

### Before

```typescript
// Old: Manual transaction building
const recipientPubkey = new PublicKey(recipient);
const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: recipientPubkey,
    lamports,
  })
);

const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = publicKey;

const signed = await signTransaction(transaction);
const signature = await connection.sendRawTransaction(signed.serialize());
```

### After

```typescript
// New: SDK handles everything
const result = await client.executePayment(
  publicKey,
  signTransaction,
  {
    recipient,
    amount,
    memo: 'Payment',
  }
);

if (result.success) {
  console.log('Payment sent:', result.signature);
}
```

## Step 4: Migrate React Hooks

### Before

```typescript
// Old: Custom hooks
const [securityCheck, setSecurityCheck] = useState({...});

const performCheck = async (address: string) => {
  setSecurityCheck({ ...securityCheck, checking: true });
  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      body: JSON.stringify({ wallet: address }),
    });
    const data = await response.json();
    setSecurityCheck({
      score: data.score,
      riskLevel: data.riskLevel,
      // ...
    });
  } catch (error) {
    // handle error
  }
};
```

### After

```typescript
// New: Use SDK hooks
import { useSolenceAiPay } from '@solenceai/payment-sdk/react';

const {
  securityCheck,
  performSecurityCheck,
  executePayment,
  paymentState,
} = useSolenceAiPay({
  config: {
    apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT!,
  },
  autoCheckTokenGate: true,
});
```

## Step 5: Update Backend (Keep Your Current Logic)

The SDK works with your existing backend! You just need to ensure these endpoints exist:

```typescript
// Keep your existing endpoints:
// - POST /api/scan
// - GET /api/badge/check
// - POST /api/payments/log
// - GET /api/transactions

// Add token gating to /api/scan
export async function POST(req: NextRequest) {
  const viewerWallet = req.headers.get('x-viewer-wallet');
  
  // Check token balance
  const hasUnlimitedAccess = await checkTokenBalance(
    viewerWallet,
    process.env.NEXT_PUBLIC_MIN_TOKEN_BALANCE
  );
  
  if (!hasUnlimitedAccess) {
    // Apply rate limiting
    const canScan = await checkRateLimit(viewerWallet);
    if (!canScan) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  }
  
  // Your existing scan logic
  const scanResult = await performSecurityScan(wallet);
  return NextResponse.json(scanResult);
}

async function checkTokenBalance(wallet: string | null, minBalance: string): Promise<boolean> {
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
    
    return totalBalance >= parseInt(minBalance);
  } catch {
    return false;
  }
}
```

## Step 6: File-by-File Migration

### PaymentForm.tsx

```diff
- import { useState, useEffect } from "react";
- import { useWallet } from "@solana/wallet-adapter-react";
+ import { useSolenceAiPay } from "@solenceai/payment-sdk/react";

export default function PaymentForm() {
-  const { publicKey, signTransaction } = useWallet();
-  const [securityCheck, setSecurityCheck] = useState({...});
-  const [paymentState, setPaymentState] = useState("idle");
  
+  const {
+    securityCheck,
+    performSecurityCheck,
+    executePayment,
+    paymentState,
+  } = useSolenceAiPay({
+    config: { apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT! },
+  });

-  const checkSecurity = async (address: string) => {
-    // manual API call
-  };
  
  const handlePayment = async () => {
-    // manual transaction building
+    const result = await executePayment({
+      recipient,
+      amount,
+      memo,
+    });
  };
}
```

### useSecurityCheck.ts (Can be removed entirely!)

```diff
- // Delete this file
- export function useSecurityCheck() {
-   // All this logic is now in the SDK
- }

+ // Just import from SDK
+ import { useSecurityCheck } from '@solenceai/payment-sdk/react';
```

## Step 7: Environment Variables

Add these to your `.env.local`:

```bash
# Existing variables (keep these)
NEXT_PUBLIC_SOLANA_RPC_URL=...
MONGODB_URI=...

# New variables for SDK
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3000/api
NEXT_PUBLIC_TOKEN_MINT_ADDRESS=YOUR_TOKEN_MINT
NEXT_PUBLIC_MIN_TOKEN_BALANCE=5000000
```

## Step 8: Test the Migration

1. **Test Security Checks**
   ```typescript
   await client.verifyRecipientSecurity(testAddress);
   ```

2. **Test Token Gating**
   ```typescript
   const status = await client.checkTokenGate(yourWallet);
   console.log('Has unlimited access:', status.hasAccess);
   ```

3. **Test Payments**
   ```typescript
   const result = await client.executePayment(publicKey, signTransaction, {
     recipient: testAddress,
     amount: '0.001',
   });
   ```

## Benefits of Migration

✅ **Less Code**: Remove ~500 lines of boilerplate  
✅ **Type Safety**: Full TypeScript support  
✅ **Token Gating**: Built-in unlimited access for token holders  
✅ **Error Handling**: Automatic retries and better error messages  
✅ **Maintenance**: SDK handles updates and bug fixes  
✅ **Testing**: Pre-tested, production-ready code  

## Rollback Plan

If you need to rollback:

1. Keep your old code in a separate branch
2. SDK doesn't modify your backend, so APIs still work
3. Simply switch imports back to your custom hooks

## Need Help?

- Check the [examples](./examples/) folder
- Read the [API documentation](./README.md)
- Open an issue on GitHub
- Join our Discord community

## Gradual Migration

You can migrate gradually:

```typescript
// Use SDK for new features
const client = new SolenceAiPayClient({...});

// Keep old code for existing features
const oldCheckSecurity = async () => {
  // your old code
};

// Phase them out over time
```
