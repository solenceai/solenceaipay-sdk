# SolenceAiPay SDK - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATOR'S APPLICATION                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Frontend (React/Next.js)                  │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  @solenceai/payment-sdk (NPM Package)           │ │   │
│  │  │                                                   │ │   │
│  │  │  ┌─────────────────────────────────────────┐   │ │   │
│  │  │  │  SolenceAiPayClient                     │   │ │   │
│  │  │  │  - checkTokenGate()                     │   │ │   │
│  │  │  │  - verifyRecipientSecurity()            │   │ │   │
│  │  │  │  - executePayment()                     │   │ │   │
│  │  │  │  - getTransactionHistory()              │   │ │   │
│  │  │  └─────────────────────────────────────────┘   │ │   │
│  │  │                                                   │ │   │
│  │  │  ┌─────────────────────────────────────────┐   │ │   │
│  │  │  │  React Hooks                            │   │ │   │
│  │  │  │  - useSolenceAiPay()                    │   │ │   │
│  │  │  │  - useSecurityCheck()                   │   │ │   │
│  │  │  │  - useTokenGate()                       │   │ │   │
│  │  │  └─────────────────────────────────────────┘   │ │   │
│  │  │                                                   │ │   │
│  │  │  ┌─────────────────────────────────────────┐   │ │   │
│  │  │  │  React Components                       │   │ │   │
│  │  │  │  - PaymentForm                          │   │ │   │
│  │  │  │  - SecurityBadge                        │   │ │   │
│  │  │  │  - TransactionHistory                   │   │ │   │
│  │  │  └─────────────────────────────────────────┘   │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                           │                             │   │
│  │                           │ HTTP Requests               │   │
│  │                           ▼                             │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Backend API (Your Server)                  │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  POST /api/scan                                  │ │   │
│  │  │  ┌──────────────────────────────────────────┐   │ │   │
│  │  │  │  1. Check Token Balance                  │   │ │   │
│  │  │  │     └─> Has 5M+ tokens? ──YES──> Unlimited │  │ │
│  │  │  │              │                              │   │ │   │
│  │  │  │              NO                             │   │ │   │
│  │  │  │              │                              │   │ │   │
│  │  │  │  2. Check Rate Limit                      │   │ │   │
│  │  │  │     └─> Used 100 scans? ──YES──> 429 Error│  │ │
│  │  │  │              │                              │   │ │   │
│  │  │  │              NO                             │   │ │   │
│  │  │  │              │                              │   │ │   │
│  │  │  │  3. Perform Security Scan                 │   │ │   │
│  │  │  │     └─> Return score & findings           │   │ │   │
│  │  │  └──────────────────────────────────────────┘   │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  GET /api/badge/check                            │ │   │
│  │  │  └─> Verify on-chain Safety Badge                │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  POST /api/payments/log                          │ │   │
│  │  │  └─> Store payment records in database           │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  GET /api/transactions                            │ │   │
│  │  │  └─> Return transaction history                   │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │ Solana RPC     │  │ MongoDB        │  │ Redis           │  │
│  │ - Token balance│  │ - Transaction  │  │ - Rate limiting │  │
│  │ - Transactions │  │ - Payment logs │  │ - Caching       │  │
│  │ - Badge NFTs   │  │ - User data    │  │                 │  │
│  └────────────────┘  └────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Token Gating Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER CONNECTS WALLET                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                 ┌─────────────────────────┐
                 │  SDK.checkTokenGate()   │
                 └──────────┬──────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │ Query Solana for Token     │
              │ Balance of User's Wallet   │
              └──────────┬──────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────────┐
         │  Balance >= NEXT_PUBLIC_MIN_TOKEN_BALANCE?  │
         └───────┬───────────────────────┬───────┘
                 │                       │
            YES  │                       │  NO
                 │                       │
                 ▼                       ▼
    ┌────────────────────┐   ┌──────────────────────┐
    │ UNLIMITED ACCESS   │   │ RATE LIMITED         │
    │ ✅ No limits       │   │ ⚠️  100 scans/day    │
    │ ✅ All features    │   │ ⚠️  Basic features   │
    └────────────────────┘   └──────────────────────┘
```

## Payment Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INITIATES PAYMENT                        │
│                    (recipient, amount, memo)                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                 ┌─────────────────────────┐
                 │  1. Security Check      │
                 │  SDK.verifyRecipient()  │
                 └──────────┬──────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │ Check Safety Badge?         │
              └──────────┬──────────────────┘
                         │
                    YES  │  NO
                         │
                         ▼
         ┌───────────────────────────────────────┐
         │  Has Badge?      │    Perform AI Scan │
         │  ✅ Instant OK   │    Get Score 0-100 │
         └───────┬──────────┴─────────┬──────────┘
                 │                    │
                 │                    ▼
                 │        ┌────────────────────┐
                 │        │ Score >= 75?       │
                 │        └──────┬─────────┬───┘
                 │               │         │
                 │          YES  │         │  NO
                 │               │         │
                 └───────────────┴─────────┴───────┐
                                 │                  │
                                 ▼                  ▼
                    ┌────────────────────┐  ┌──────────────┐
                    │  2. Build Tx       │  │  Show Warning│
                    │  Transaction       │  │  User Confirm│
                    └─────────┬──────────┘  └──────┬───────┘
                              │                     │
                              │◄────────────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │  3. Sign Transaction    │
                 │  User signs in wallet   │
                 └──────────┬──────────────┘
                            │
                            ▼
                 ┌─────────────────────────┐
                 │  4. Send to Network     │
                 │  Broadcast to Solana    │
                 └──────────┬──────────────┘
                            │
                            ▼
                 ┌─────────────────────────┐
                 │  5. Confirm & Log       │
                 │  Wait for confirmation  │
                 │  Save to database       │
                 └──────────┬──────────────┘
                            │
                            ▼
                 ┌─────────────────────────┐
                 │  ✅ SUCCESS             │
                 │  Return signature       │
                 └─────────────────────────┘
```

## Data Flow Diagram

```
Frontend                 SDK                  Backend                 Blockchain
   │                     │                      │                        │
   │──check balance──────>│                      │                        │
   │                     │──query tokens────────>│                        │
   │                     │                      │──RPC call──────────────>│
   │                     │                      │<──token balance─────────│
   │                     │<──has access─────────│                        │
   │<──token status──────│                      │                        │
   │                     │                      │                        │
   │──enter recipient────>│                      │                        │
   │                     │──scan request────────>│                        │
   │                     │                      │──[check token gate]    │
   │                     │                      │──[check rate limit]    │
   │                     │                      │──[perform AI scan]     │
   │                     │<──security score─────│                        │
   │<──security check────│                      │                        │
   │                     │                      │                        │
   │──send payment───────>│                      │                        │
   │                     │──build tx────────────>│                        │
   │                     │<──unsigned tx────────│                        │
   │<──sign request──────│                      │                        │
   │──signed tx──────────>│                      │                        │
   │                     │──send tx─────────────────────────────────────>│
   │                     │                      │                        │
   │                     │──log payment─────────>│                        │
   │                     │                      │──[save to DB]          │
   │<──success + sig─────│<──confirmed──────────────────────────────────│
   │                     │                      │                        │
```

## Rate Limiting Logic

```
Request arrives at /api/scan
        │
        ▼
  ┌─────────────────┐
  │ Get viewer      │
  │ wallet address  │
  └────────┬────────┘
           │
           ▼
  ┌──────────────────────┐
  │ Check token balance  │
  │ via Solana RPC       │
  └────────┬─────────────┘
           │
           ▼
    ┌──────────────┐
    │ Has 5M+      │
    │ tokens?      │
    └───┬──────┬───┘
        │      │
    YES │      │ NO
        │      │
        │      ▼
        │  ┌─────────────────┐
        │  │ Get rate limit  │
        │  │ count from Redis│
        │  └────────┬────────┘
        │           │
        │           ▼
        │     ┌──────────────┐
        │     │ Count >= 100?│
        │     └───┬──────┬───┘
        │         │      │
        │     YES │      │ NO
        │         │      │
        │         │      ▼
        │         │  ┌────────────┐
        │         │  │ Increment  │
        │         │  │ count      │
        │         │  └──────┬─────┘
        │         │         │
        │         │         ▼
        │         │    ┌─────────────┐
        │         │    │ Allow scan  │
        │         │    └─────────────┘
        │         │
        │         ▼
        │    ┌─────────────┐
        │    │ Return 429  │
        │    │ error       │
        │    └─────────────┘
        │
        ▼
   ┌──────────────┐
   │ Allow scan   │
   │ (unlimited)  │
   └──────────────┘
```

## Database Schema

```sql
-- Payment Logs
Table: payment_logs
├── _id: ObjectId
├── sender: String (wallet address)
├── recipient: String (wallet address)
├── amount: String (SOL amount)
├── security_score: Number (0-100)
├── risk_level: String (LOW/MEDIUM/HIGH)
├── success: Boolean
├── transaction_signature: String
├── error_message: String
├── timestamp: Date
└── metadata: Object

-- Transactions
Table: transactions
├── _id: ObjectId
├── signature: String (unique)
├── sender: String
├── recipient: String
├── amount: Number
├── status: String (success/pending/failed)
├── security_score: Number
├── memo: String
└── timestamp: Date

-- Rate Limits (Redis)
Key: scans:{wallet}:{date}
Value: count (number of scans today)
TTL: 86400 seconds (24 hours)
```

## Component Hierarchy

```
App
└── SolenceAiPayProvider
    └── Your App Components
        ├── PaymentForm (pre-built)
        │   ├── RecipientInput
        │   ├── SecurityCheckDisplay
        │   ├── AmountInput
        │   ├── MemoInput
        │   └── PaymentButton
        │
        ├── SecurityBadge (pre-built)
        │
        ├── TransactionHistory (pre-built)
        │   └── TransactionList
        │       └── TransactionItem
        │
        └── Custom Components
            └── useSolenceAiPay() hook
                ├── securityCheck
                ├── performSecurityCheck()
                ├── executePayment()
                ├── tokenGateStatus
                └── transactions
```

---

All diagrams are text-based for easy version control and universal compatibility.
