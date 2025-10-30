# SolenceAiPay SDK

AI-powered secure payment infrastructure for Solana applications. Built on OpenLibx402.

## Features

- 🛡️ **AI-Powered Security Scanning** - Real-time wallet risk assessment before payments
- ✅ **Safety Badge Verification** - Instant approval for verified wallets
- 🎯 **Token-Gated API Access** - Unlimited scans for token holders
- 🔄 **Transaction Management** - Complete payment lifecycle handling
- ⚛️ **React Integration** - Pre-built hooks and components
- 📊 **Transaction History** - Track all payments
- 🔌 **Easy Integration** - Simple API with TypeScript support

## Installation

```bash
npm install @solenceai/payment-sdk @solana/web3.js @solana/wallet-adapter-react
```

```bash
yarn add @solenceai/payment-sdk @solana/web3.js @solana/wallet-adapter-react
```

## Quick Start

### 1. Basic Setup (Vanilla JS/TS)

```typescript
import { SolenceAiPayClient } from '@solenceai/payment-sdk';

const client = new SolenceAiPayClient({
  apiEndpoint: 'https://your-app.com/api', // Your API endpoint
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  securityThreshold: 75,
  tokenMintAddress: 'YOUR_TOKEN_MINT_ADDRESS', // Optional
  minTokenBalance: 5000000, // 5M tokens for unlimited access
  debug: true,
});

// Check security before payment
const securityCheck = await client.verifyRecipientSecurity(recipientAddress, senderAddress);

if (securityCheck.passed) {
  // Proceed with payment
  const result = await client.executePayment(
    senderPublicKey,
    signTransaction,
    {
      recipient: recipientAddress,
      amount: '0.1', // SOL
      memo: 'Payment for services',
    }
  );
  
  console.log('Payment successful:', result.signature);
}
```

### 2. React Integration

```tsx
import { SolenceAiPayProvider, useSolenceAiPay } from '@solenceai/payment-sdk/react';

// Wrap your app with the provider
function App() {
  return (
    <SolenceAiPayProvider
      config={{
        apiEndpoint: 'https://your-app.com/api',
        tokenMintAddress: process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS,
        minTokenBalance: parseInt(process.env.NEXT_PUBLIC_MIN_TOKEN_BALANCE || '5000000'),
      }}
    >
      <PaymentComponent />
    </SolenceAiPayProvider>
  );
}

// Use the hook in your components
function PaymentComponent() {
  const {
    securityCheck,
    performSecurityCheck,
    executePayment,
    paymentState,
    tokenGateStatus,
  } = useSolenceAiPay({
    config: {
      apiEndpoint: 'https://your-app.com/api',
    },
    autoCheckTokenGate: true,
  });

  const handlePayment = async () => {
    const result = await executePayment({
      recipient: recipientAddress,
      amount: '0.1',
    });
    
    if (result.success) {
      console.log('Payment sent:', result.signature);
    }
  };

  return (
    <div>
      {tokenGateStatus?.hasAccess && <p>🎉 Unlimited API access</p>}
      
      <input
        onChange={(e) => performSecurityCheck(e.target.value)}
        placeholder="Recipient address"
      />
      
      {securityCheck.score && (
        <div>Security Score: {securityCheck.score}/100</div>
      )}
      
      <button onClick={handlePayment} disabled={paymentState !== 'idle'}>
        Send Payment
      </button>
    </div>
  );
}
```

### 3. Pre-built Components

```tsx
import { PaymentForm, TransactionHistory } from '@solenceai/payment-sdk/react';

function MyApp() {
  return (
    <div>
      <PaymentForm
        onSuccess={(signature) => console.log('Success:', signature)}
        onError={(error) => console.error('Error:', error)}
      />
      
      <TransactionHistory />
    </div>
  );
}
```

## Backend Integration

### Required API Endpoints

Your backend needs to implement these endpoints:

#### 1. Security Scan - `POST /api/scan`

```typescript
// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  const { wallet, isPublic, skipPayment } = await req.json();
  const viewerWallet = req.headers.get('x-viewer-wallet');
  
  // Check if user has token access for unlimited scans
  const hasTokenAccess = await checkTokenBalance(
    viewerWallet,
    process.env.NEXT_PUBLIC_MIN_TOKEN_BALANCE
  );
  
  if (!hasTokenAccess) {
    // Implement rate limiting here
    const remaining = await checkRateLimit(viewerWallet);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Hold tokens for unlimited access.' },
        { status: 429 }
      );
    }
  }
  
  // Perform security scan
  const scanResult = await performSecurityScan(wallet);
  
  return NextResponse.json(scanResult);
}

async function checkTokenBalance(wallet: string, minBalance: string): Promise<boolean> {
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const publicKey = new PublicKey(wallet);
    const tokenMint = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS!);
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { mint: tokenMint }
    );
    
    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      totalBalance += account.account.data.parsed.info.tokenAmount.uiAmount || 0;
    }
    
    return totalBalance >= parseInt(minBalance);
  } catch {
    return false;
  }
}
```

#### 2. Badge Check - `GET /api/badge/check?wallet=ADDRESS`

```typescript
// app/api/badge/check/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  
  // Check on-chain for Safety Badge NFT
  const hasBadge = await checkOnChainBadge(wallet);
  
  return NextResponse.json({
    onChainBadge: hasBadge,
    wallet,
  });
}
```

#### 3. Transaction History - `GET /api/transactions?wallet=ADDRESS`

```typescript
// app/api/transactions/route.ts
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  
  // Fetch from your database
  const transactions = await db.transactions.find({
    $or: [{ sender: wallet }, { recipient: wallet }]
  });
  
  return NextResponse.json({ transactions });
}
```

#### 4. Payment Logging - `POST /api/payments/log`

```typescript
// app/api/payments/log/route.ts
export async function POST(req: NextRequest) {
  const data = await req.json();
  
  await db.paymentLogs.create(data);
  
  return NextResponse.json({ success: true });
}
```

## Environment Variables

Create a `.env.local` file:

```bash
# Your application
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_TOKEN_MINT_ADDRESS=YOUR_TOKEN_MINT_ADDRESS
NEXT_PUBLIC_MIN_TOKEN_BALANCE=5000000

# MongoDB (for transaction storage)
MONGODB_URI=mongodb+srv://...

# API endpoints
NEXT_PUBLIC_API_ENDPOINT=https://your-app.com/api
```

## Token-Gated Access

The SDK supports token-gated API access:

- **Token Holders**: Unlimited security scans
- **Non-Holders**: Limited to 100 scans per day (configurable)

```typescript
const tokenStatus = await client.checkTokenGate(walletAddress);

if (tokenStatus.hasAccess) {
  console.log('Unlimited access!');
} else {
  console.log(`${tokenStatus.remainingCalls} scans remaining`);
}
```

## Advanced Usage

### Custom Security Thresholds

```typescript
const client = new SolenceAiPayClient({
  apiEndpoint: 'https://your-app.com/api',
  securityThreshold: 80, // Stricter threshold
});
```

### Event Listeners

```typescript
client.on('security_check_completed', (event) => {
  console.log('Security check done:', event.data);
});

client.on('payment_confirmed', (event) => {
  console.log('Payment confirmed:', event.data);
});

client.on('rate_limit_exceeded', (event) => {
  console.log('Rate limit hit:', event.data);
});
```

### Force Risky Payments

```typescript
const result = await client.executePayment(
  senderPublicKey,
  signTransaction,
  paymentDetails,
  {
    forcePayment: true, // Skip security warnings
  }
);
```

### Custom Retry Logic

```typescript
const client = new SolenceAiPayClient({
  apiEndpoint: 'https://your-app.com/api',
  autoRetry: true,
  maxRetries: 5,
  retryDelay: 2000, // 2 seconds
});
```

## API Reference

### SolenceAiPayClient

Main client class for SDK operations.

#### Methods

- `checkTokenGate(walletAddress: string): Promise<TokenGateStatus>`
- `checkSafetyBadge(walletAddress: string): Promise<boolean>`
- `verifyRecipientSecurity(recipient: string, viewer?: string): Promise<SecurityVerificationResult>`
- `buildPaymentTransaction(sender: PublicKey, recipient: string, amount: number): Promise<TransactionData>`
- `executePayment(sender: PublicKey, signTx: Function, details: PaymentDetails, options?: Options): Promise<PaymentResult>`
- `getTransactionHistory(walletAddress: string): Promise<TransactionLog[]>`
- `getBalance(walletAddress: string): Promise<number>`
- `updateConfig(config: Partial<SolenceAiPayConfig>): void`
- `on(event: string, handler: Function): void`
- `off(event: string, handler: Function): void`

### React Hooks

- `useSolenceAiPay(options)` - Main hook for all features
- `useSecurityCheck(client)` - Security checks only
- `useTokenGate(client)` - Token gate status

## Security Best Practices

1. **Always perform security checks** before payments
2. **Respect user warnings** for risky wallets
3. **Store API keys securely** (use environment variables)
4. **Implement rate limiting** on your backend
5. **Log all transactions** for audit trails
6. **Use HTTPS** for all API calls
7. **Validate addresses** before scanning

## Examples

Check the `/examples` directory for complete implementations:

- Next.js 13+ App Router
- React SPA
- Node.js Backend
- Express.js Middleware

## Support

- Documentation: [https://solenceai.com/docs](https://solenceai.com/docs)
- GitHub: [https://github.com/solenceai/payment-sdk](https://github.com/solenceai/payment-sdk)
- Discord: [https://discord.gg/solenceai](https://discord.gg/solenceai)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

---

Built with ❤️ by [SolenceAI](https://solenceai.com) on OpenLibx402
