# Green Tech Procurement

Sustainable procurement platform. Buyers post green RFPs, vendors bid.

## Stack

Express + EJS + better-sqlite3 + JWT auth + Tailwind CDN.

## Quick start

```bash
npm install
npm start
# http://localhost:3000
```

## Seed data

```bash
node scripts/seed-full.js
# 103 vendors, 264 products, 20 RFPs, 98 bids
```

### Login

| Role | Email | Password |
|------|-------|----------|
| Buyer | `ecocorp@buyer.com` | `buyer123` |
| Vendor | `${company}###@greentech.com` | `vendor123` |

Vendor emails match company names, e.g. `solarnovaenergy123@greentech.com`. Find in DB: `node -e "const db=require('./config/db'); db.prepare(\"SELECT email FROM users WHERE role='vendor' LIMIT 5\").all().map(r=>console.log(r.email))"`

## DB

SQLite — `data/green_tech_procurement.db`. Browse with:

```bash
node -e "const db=require('./config/db'); db.prepare('SELECT name FROM sqlite_master WHERE type=\\'table\\'').all().map(t=>console.log(t.name))"
```

## Tests

```bash
npm test
# 88 tests, ~5s
```

## API

`/api/v1/*` — JSON endpoints for auth, rfps, bids, products, vendors, dashboard.
