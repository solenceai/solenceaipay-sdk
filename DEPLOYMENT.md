# Publishing & Deployment Guide

Complete guide to publishing the SolenceAiPay SDK to NPM and deploying to production.

## Pre-Publishing Checklist

- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Documentation is complete
- [ ] Examples are working
- [ ] Version number is updated
- [ ] CHANGELOG is updated
- [ ] License file exists

## Step 1: Prepare for Publishing

### 1.1 Create NPM Account

```bash
npm login
```

### 1.2 Update Package.json

```json
{
  "name": "@solenceai/payment-sdk",
  "version": "1.0.0",
  "description": "AI-powered secure payment SDK for Solana",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "repository": {
    "type": "git",
    "url": "https://github.com/solenceai/payment-sdk"
  },
  "keywords": [
    "solana",
    "payment",
    "security",
    "ai",
    "web3",
    "blockchain",
    "cryptocurrency"
  ],
  "author": "SolenceAI <contact@solenceai.com>",
  "license": "MIT"
}
```

### 1.3 Create .npmignore

```
# Source files
src/
tsconfig.json
tsup.config.ts

# Development
node_modules/
.env*
.git/
.github/

# Tests
**/*.test.ts
**/*.spec.ts
coverage/

# Documentation
docs/
examples/
*.md
!README.md

# Build artifacts
*.log
*.tsbuildinfo
```

## Step 2: Build the SDK

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Verify build
ls -la dist/
```

Expected output:
```
dist/
├── index.js
├── index.mjs
├── index.d.ts
├── react/
│   ├── index.js
│   ├── index.mjs
│   └── index.d.ts
```

## Step 3: Test Locally

### 3.1 Link Locally

```bash
# In SDK directory
npm link

# In your test project
npm link @solenceai/payment-sdk
```

### 3.2 Test Import

```typescript
import { SolenceAiPayClient } from '@solenceai/payment-sdk';
import { useSolenceAiPay } from '@solenceai/payment-sdk/react';

// Test instantiation
const client = new SolenceAiPayClient({
  apiEndpoint: 'http://localhost:3000/api',
});

console.log('SDK loaded successfully!');
```

## Step 4: Publish to NPM

### 4.1 Dry Run

```bash
npm publish --dry-run
```

Review the output to ensure all necessary files are included.

### 4.2 Publish (First Time)

```bash
# For scoped packages
npm publish --access public

# Check on NPM
npm view @solenceai/payment-sdk
```

### 4.3 Publish Updates

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch
npm publish

# Minor version (1.0.0 -> 1.1.0)
npm version minor
npm publish

# Major version (1.0.0 -> 2.0.0)
npm version major
npm publish
```

## Step 5: Set Up GitHub Repository

### 5.1 Create Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/solenceai/payment-sdk.git
git push -u origin main
```

### 5.2 Create GitHub Actions for CI/CD

```yaml
# .github/workflows/publish.yml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 5.3 Add NPM Token to GitHub Secrets

1. Go to npmjs.com → Access Tokens
2. Create new token (Automation type)
3. Add to GitHub: Settings → Secrets → `NPM_TOKEN`

## Step 6: Create Documentation Site

### 6.1 Using GitHub Pages

```bash
# Install documentation generator
npm install -g typedoc

# Generate docs
typedoc src/index.ts --out docs

# Push to gh-pages branch
git checkout -b gh-pages
git add docs
git commit -m "Add documentation"
git push origin gh-pages
```

### 6.2 Enable GitHub Pages

Repository Settings → Pages → Source: `gh-pages` branch

## Step 7: Backend Deployment

### 7.1 Vercel Deployment (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### 7.2 Environment Variables

Set these in Vercel Dashboard:

```bash
MONGODB_URI=mongodb+srv://...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_TOKEN_MINT_ADDRESS=YOUR_TOKEN_MINT
NEXT_PUBLIC_MIN_TOKEN_BALANCE=5000000
OPENAI_API_KEY=sk-...
```

### 7.3 Custom Domain

1. Add domain in Vercel Dashboard
2. Update DNS records
3. Wait for SSL cert provisioning

## Step 8: Production Monitoring

### 8.1 Set Up Error Tracking

```typescript
// app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 8.2 Set Up Analytics

```typescript
// Track SDK usage
client.on('payment_confirmed', (event) => {
  analytics.track('Payment Success', {
    amount: event.data.amount,
    signature: event.data.signature,
  });
});

client.on('payment_failed', (event) => {
  analytics.track('Payment Failed', {
    error: event.data.error,
  });
});
```

### 8.3 Set Up Monitoring Dashboard

Use services like:
- **Datadog**: Application performance monitoring
- **Grafana**: Custom dashboards
- **Sentry**: Error tracking
- **LogRocket**: Session replay

## Step 9: Marketing & Distribution

### 9.1 Create Landing Page

Include:
- Features overview
- Live demo
- Quick start guide
- API documentation link
- Pricing (if applicable)

### 9.2 Announcement Posts

- Twitter/X announcement
- Reddit (r/solana, r/solandev)
- Discord servers
- Dev.to article
- Medium post

### 9.3 Developer Outreach

- Submit to Awesome Solana list
- Post on Solana Discord
- Present at Solana hackathons
- Write tutorial blog posts

## Step 10: Post-Launch Maintenance

### 10.1 Monitor NPM Downloads

```bash
npm view @solenceai/payment-sdk
```

### 10.2 Track GitHub Stars

Monitor repository growth and issues.

### 10.3 Community Management

- Respond to GitHub issues within 24h
- Answer questions on Discord
- Update documentation based on feedback

### 10.4 Regular Updates

- Security patches (as needed)
- Feature updates (monthly)
- Dependency updates (weekly)

## Version Management

### Semantic Versioning

- **Major (1.0.0 → 2.0.0)**: Breaking changes
- **Minor (1.0.0 → 1.1.0)**: New features, backward compatible
- **Patch (1.0.0 → 1.0.1)**: Bug fixes

### Changelog Format

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- Token gating for unlimited API access
- New `useTokenGate` hook
- Transaction history pagination

### Fixed
- Rate limiting edge cases
- TypeScript type exports

### Changed
- Improved error messages
- Updated dependencies

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Security check functionality
- Payment execution
- React hooks and components
```

## Rollback Procedure

If you need to unpublish or rollback:

```bash
# Unpublish a specific version (within 72h)
npm unpublish @solenceai/payment-sdk@1.0.1

# Deprecate a version
npm deprecate @solenceai/payment-sdk@1.0.1 "Security vulnerability, use 1.0.2+"

# Publish a fix
npm version patch
npm publish
```

## Security Best Practices

1. **Never commit secrets** to repository
2. **Use GitHub Secrets** for CI/CD
3. **Enable 2FA** on NPM account
4. **Sign releases** with GPG
5. **Run security audits** regularly

```bash
npm audit
npm audit fix
```

## Performance Optimization

### Bundle Size

```bash
# Check bundle size
npm install -g bundlephobia-cli
bundlephobia @solenceai/payment-sdk
```

### Tree Shaking

Ensure your build supports tree shaking for optimal bundle sizes.

## Support Channels

After publishing, set up:

1. **GitHub Discussions**: Community Q&A
2. **Discord Server**: Real-time support
3. **Email**: contact@solenceai.com
4. **Documentation**: solenceai.com/docs

## Success Metrics

Track these KPIs:

- NPM downloads per week
- GitHub stars
- GitHub issues (open/closed ratio)
- Community Discord members
- Integration count (apps using SDK)

## Congratulations! 🎉

Your SDK is now published and ready for the world to use!

## Quick Commands Reference

```bash
# Build
npm run build

# Test locally
npm link

# Publish
npm version patch
npm publish

# Deploy backend
vercel --prod

# Monitor
npm view @solenceai/payment-sdk
```

## Need Help?

- Documentation: https://solenceai.com/docs
- GitHub Issues: https://github.com/solenceai/payment-sdk/issues
- Discord: https://discord.gg/solenceai
- Email: support@solenceai.com
