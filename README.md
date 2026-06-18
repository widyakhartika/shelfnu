# Shelfnu Bot — DCSO Internal Automation

Telegram Bot untuk pengajuan aset melalui iAssets.

## Setup

### 1. Clone & install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env dengan nilai yang sesuai
```

### 3. Setup database
```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Update category IDs
Edit `src/config/categories.config.ts` dan isi `categoryId` untuk setiap kategori aset.

### 5. Run development
```bash
npm run dev
```

## Docker

```bash
cp .env.example .env
# Edit .env
docker compose up -d
```

## Commands

| Command | Keterangan |
|---------|------------|
| /start | Welcome message |
| /asset | Wizard pengajuan aset baru |
| /history | Riwayat 10 pengajuan terakhir |
| /help | Bantuan |

## Category Configuration

Edit `src/config/categories.config.ts`:
```typescript
{ id: 'laptop', label: 'Laptop', categoryId: 'cmqaxzz6b00njpq07n55acdkr' },
```

## Approver Configuration

Edit `src/config/approvers.config.ts` untuk mengubah approver levels.

## Architecture

```
src/
├── bot/            # Telegram bot (Grammy)
│   ├── conversations/  # Wizard flows
│   ├── handlers/       # Command handlers
│   └── middleware/     # Session, etc.
├── services/       # Business logic
├── clients/        # External API clients (iAssets)
├── config/         # Categories, approvers, env
├── db/             # Prisma client
├── logger/         # Winston
└── types/          # Shared TypeScript types
```

## Future Features

- Asset Return
- Asset Handover
- Approval Tracking
- Employee Resign Checklist
- VPN Revoke
- Email Disable
- Subscription Reminder
- Server Inventory
