# SolenceAiPay SDK - Complete Implementation Guide

## 🎯 Overview

This SDK allows other projects to integrate SolenceAiPay's AI-powered secure payment system with **token-gated unlimited API access**.

### Key Features
✅ **Token Gating**: Hold `NEXT_PUBLIC_MIN_TOKEN_BALANCE` tokens for unlimited scans  
✅ **Rate Limiting**: Non-holders get 100 scans/day (configurable)  
✅ **AI Security**: Real-time wallet risk assessment  
✅ **Safety Badges**: Instant approval for verified wallets  
✅ **React Ready**: Pre-built hooks and components  
✅ **TypeScript**: Full type safety  

---

## 📦 Package Structure

```
@solenceai/payment-sdk/
├── dist/
│   ├── index.js          # Core SDK
│   ├── index.d.ts        # TypeScript definitions
│   ├── react/
│   │   ├── index.js      # React hooks & components
│   │   └── index.d.ts
├── src/
│   ├── client.ts         # Main SDK client
│   ├── types.ts          # TypeScript types
│   ├── utils.ts          # Utility functions
│   └── react/
│       ├── hooks.ts      # React hooks
│       └── components.tsx # React components
├── examples/
│   └── nextjs-integration.md
├── README.md
├── MIGRATION.md
├── DEPLOYMENT.md
└── package.json
```

---

## 🚀 Quick Start

### 1. Install SDK

```bash
npm install @solenceai/payment-sdk @solana/web3.js @solana/wallet-adapter-react
```

### 2. Basic Usage

```typescript
import { SolenceAiPayClient } from '@solenceai/payment-sdk';

const client = new SolenceAiPayClient({
  apiEndpoint: 'https://your-app.com/api',
  tokenMintAddress: process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS,
  minTokenBalance: 5000000, // 5M tokens for unlimited access
  rateLimitPerDay: 100, // Non-holders limit
});

// Check if user has unlimited access
const tokenStatus = await client.checkTokenGate(walletAddress);
console.log('Has unlimited access:', tokenStatus.hasAccess);

// Perform security check
const security = await client.verifyRecipientSecurity(recipientAddress);

// Execute payment
const result = await client.executePayment(
  senderPublicKey,
  signTransaction,
  {
    recipient: recipientAddress,
    amount: '0.1',
  }
);
```

### 3. React Integration

```tsx
import { SolenceAiPayProvider, useSolenceAiPay } from '@solenceai/payment-sdk/react';

function App() {
  return (
    <SolenceAiPayProvider
      config={{
        apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT,
        tokenMintAddress: process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS,
        minTokenBalance: 5000000,
      }}
    >
      <PaymentForm />
    </SolenceAiPayProvider>
  );
}

function PaymentForm() {
  const {
    securityCheck,
    performSecurityCheck,
    executePayment,
    tokenGateStatus,
  } = useSolenceAiPayContext();

  return (
    <div>
      {tokenGateStatus?.hasAccess ? (
        <p>🎉 Unlimited API access!</p>
      ) : (
        <p>{tokenGateStatus?.remainingCalls} scans remaining</p>
      )}
      {/* Rest of your form */}
    </div>
  );
}
```

---

## 🔐 Backend Implementation

### Required Endpoints

Your backend must implement these endpoints:

#### 1. POST /api/scan (Security Scanner)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  const { wallet } = await req.json();
  const viewerWallet = req.headers.get('x-viewer-wallet');

  // CHECK TOKEN GATING
  const hasUnlimitedAccess = await checkTokenBalance(viewerWallet);

  if (!hasUnlimitedAccess) {
    // Apply rate limiting for non-token holders
    const canScan = await checkRateLimit(viewerWallet);
    if (!canScan) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Hold tokens for unlimited access.' },
        { status: 429 }
      );
    }
  }

  // Perform your security scan
  const scanResult = await performSecurityScan(wallet);
  
  return NextResponse.json(scanResult);
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
    
    // CHECK IF BALANCE MEETS MINIMUM
    return totalBalance >= parseInt(process.env.NEXT_PUBLIC_MIN_TOKEN_BALANCE!);
  } catch {
    return false;
  }
}

async function checkRateLimit(wallet: string | null): Promise<boolean> {
  if (!wallet) return false;
  
  // Implement rate limiting (Redis, DB, etc.)
  // Example: Check if wallet has exceeded 100 scans today
  const scanCount = await redis.get(`scans:${wallet}:${today}`);
  
  if (!scanCount) {
    await redis.set(`scans:${wallet}:${today}`, 1, 'EX', 86400);
    return true;
  }
  
  const count = parseInt(scanCount);
  if (count >= 100) {
    return false; // Rate limit exceeded
  }
  
  await redis.incr(`scans:${wallet}:${today}`);
  return true;
}
```

#### 2. GET /api/badge/check (Badge Verification)

```typescript
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  
  // Check on-chain for Safety Badge
  const hasBadge = await checkOnChainBadge(wallet);
  
  return NextResponse.json({
    onChainBadge: hasBadge,
    wallet,
  });
}
```

#### 3. POST /api/payments/log (Payment Logging)

```typescript
export async function POST(req: NextRequest) {
  const data = await req.json();
  
  await db.paymentLogs.create({
    sender: data.sender,
    recipient: data.recipient,
    amount: data.amount,
    success: data.success,
    transactionSignature: data.transactionSignature,
    securityScore: data.securityScore,
    timestamp: new Date(),
  });
  
  return NextResponse.json({ success: true });
}
```

#### 4. GET /api/transactions (Transaction History)

```typescript
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  
  const transactions = await db.transactions.find({
    $or: [{ sender: wallet }, { recipient: wallet }]
  }).sort({ timestamp: -1 });
  
  return NextResponse.json({ transactions });
}
```

---

## ⚙️ Environment Variables

```bash
# Required
NEXT_PUBLIC_API_ENDPOINT=https://your-app.com/api
NEXT_PUBLIC_TOKEN_MINT_ADDRESS=YOUR_TOKEN_MINT_ADDRESS
NEXT_PUBLIC_MIN_TOKEN_BALANCE=5000000

# Optional
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MONGODB_URI=mongodb+srv://...
```

---

## 🎨 Token Gating Flow

```
User connects wallet
       ↓
SDK checks token balance
       ↓
    Has tokens? ──YES──> Unlimited API access
       ↓                   (No rate limits)
       NO
       ↓
  Rate limited
  (100 scans/day)
```

---

## 📊 Rate Limiting Implementation

### Option 1: Redis (Recommended)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(wallet: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `scans:${wallet}:${today}`;
  
  const count = await redis.incr(key);
  
  if (count === 1) {
    // First scan of the day - set expiry
    await redis.expire(key, 86400); // 24 hours
  }
  
  return count <= 100;
}
```

### Option 2: MongoDB

```typescript
async function checkRateLimit(wallet: string): Promise<boolean> {
  const today = new Date().setHours(0, 0, 0, 0);
  
  const doc = await db.rateLimits.findOneAndUpdate(
    { wallet, date: today },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  
  return doc.count <= 100;
}
```

---

## 🧪 Testing

### Test Token Gating

```typescript
// Test with token holder wallet
const status1 = await client.checkTokenGate('WALLET_WITH_TOKENS');
console.log(status1.hasAccess); // true

// Test with non-holder wallet
const status2 = await client.checkTokenGate('WALLET_WITHOUT_TOKENS');
console.log(status2.hasAccess); // false
console.log(status2.remainingCalls); // 100
```

### Test Rate Limiting

```bash
# Make 101 requests from non-holder wallet
for i in {1..101}; do
  curl -X POST https://your-app.com/api/scan \
    -H "Content-Type: application/json" \
    -H "x-viewer-wallet: NON_HOLDER_WALLET" \
    -d '{"wallet": "RECIPIENT_ADDRESS"}'
done

# Request 101 should return 429
```

---

## 📈 Analytics & Monitoring

### Track Usage

```typescript
client.on('token_gate_checked', (event) => {
  analytics.track('Token Gate Check', {
    wallet: event.data.walletAddress,
    hasAccess: event.data.hasAccess,
  });
});

client.on('rate_limit_exceeded', (event) => {
  analytics.track('Rate Limit Hit', {
    endpoint: event.data.endpoint,
    timestamp: event.timestamp,
  });
});
```

### Monitor Metrics

- Token holders vs non-holders ratio
- API calls per day (split by user type)
- Rate limit hits
- Payment success rate
- Average security scores

---

## 🔄 Migration from Current Implementation

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

Quick summary:
1. Install SDK: `npm install @solenceai/payment-sdk`
2. Replace manual API calls with SDK methods
3. Add token gating to backend
4. Update environment variables
5. Test thoroughly

---

## 📚 Documentation

- **README.md**: Getting started & API reference
- **MIGRATION.md**: Migrate existing code
- **DEPLOYMENT.md**: Publishing & deployment
- **examples/**: Integration examples

---

## 🛠️ Production Checklist

Backend:
- [ ] Implement all 4 required endpoints
- [ ] Add token balance checking
- [ ] Implement rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure environment variables
- [ ] Test token gating flow

Frontend:
- [ ] Install SDK
- [ ] Wrap app with provider
- [ ] Display token gate status
- [ ] Handle rate limit errors
- [ ] Test with token holders
- [ ] Test with non-holders

---

## 🆘 Support

- **Issues**: https://github.com/solenceai/payment-sdk/issues
- **Discussions**: https://github.com/solenceai/payment-sdk/discussions
- **Discord**: https://discord.gg/solenceai
- **Email**: support@solenceai.com

---

## 📝 License

MIT License - see [LICENSE](./LICENSE)

---

## 🎉 Success Stories

Projects using this SDK:

1. **YourProject** - Add your project here!

---

Built with ❤️ by SolenceAI on OpenLibx402
