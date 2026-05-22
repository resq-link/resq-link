# Account Creation Scripts

These scripts help you quickly create accounts for testing and development.

## Prerequisites

1. **Set Environment Variables**
   - Create `.env` file in `packages/firebase/` or set environment variables
   - See main `README.md` for required variables

2. **Install Dependencies**
   ```bash
   cd packages/firebase
   npm install
   npm run build
   ```

3. **Install ts-node** (if not already installed)
   ```bash
   npm install -g ts-node
   # or
   npm install --save-dev ts-node
   ```

## Available Scripts

### 0. Seed Incident Type Rules

Populates the Firestore `incidentTypeRules` collection from the repo seed catalog.

```bash
npx ts-node scripts/seed-incident-type-rules.ts
```

Optional overwrite mode:

```bash
SEED_MODE=overwrite npx ts-node scripts/seed-incident-type-rules.ts
```

Use this before opening Incident Management or Intake if the catalog is empty.

### 1. Create Dispatcher Accounts

Creates accounts for all dispatcher types (BFP, PNP, MDRRMO, AMBULANCE, PCG).

```bash
npx ts-node scripts/create-dispatcher-accounts.ts
```

**Creates:**
- `bfp@rescue.ph` - BFP Dispatcher
- `pnp@rescue.ph` - PNP Dispatcher
- `mdrrmo@rescue.ph` - MDRRMO Dispatcher
- `ambulance@rescue.ph` - Ambulance Dispatcher
- `pcg@rescue.ph` - PCG Dispatcher

**Default Passwords:**
- BFP: `BFP2024!`
- PNP: `PNP2024!`
- MDRRMO: `MDRRMO2024!`
- AMBULANCE: `AMBULANCE2024!`
- PCG: `PCG2024!`

---

### 2. Create Command Center Accounts

Creates command center accounts.

```bash
npx ts-node scripts/create-command-center.ts
```

**Creates:**
- `manila@commandcenter.ph` - Manila Command Center
- `quezon@commandcenter.ph` - Quezon City Command Center
- `makati@commandcenter.ph` - Makati Command Center

**Default Passwords:**
- Manila: `Manila2024!`
- Quezon: `Quezon2024!`
- Makati: `Makati2024!`

---

### 3. Create Civilian Mobile App Users (automatic — like responders)

**Use this** for batch seeding. No prompts. Same style as `create-standard-dispatchers-admin.ts`.

```bash
npx ts-node scripts/create-civilian-users.ts
```

**Login on civilian app (email + password):**

| Email | Password |
|-------|----------|
| `civilian@rescue.ph` | `Civilian2024!` |
| `maria.santos@rescue.ph` | `Civilian2024!` |
| `juan.delacruz@rescue.ph` | `Civilian2024!` |

---

## Customizing Scripts

You can edit the scripts to:
- Change email addresses
- Change passwords
- Add more accounts
- Modify account details

**Example: Add more dispatchers**

Edit `create-dispatcher-accounts.ts`:

```typescript
const dispatchers = [
  // ... existing dispatchers
  {
    email: 'custom@rescue.ph',
    password: 'Custom2024!',
    role: 'BFP' as const,
    name: 'Custom Dispatcher'
  }
];
```

---

## Running All Scripts

Create a master script or run them individually:

```bash
# Create all dispatchers
npx ts-node scripts/create-dispatcher-accounts.ts

# Create all command centers
npx ts-node scripts/create-command-center.ts

# Civilian mobile app (email/password login)
npx ts-node scripts/create-civilian-users.ts
```

---

## Troubleshooting

### "Cannot find module"
- Make sure you've run `npm run build` in `packages/firebase`
- Check that environment variables are set

### "Email already in use"
- The account already exists
- Script will skip and continue

---

## Security Notes

⚠️ **Important:**
- These scripts are for development/testing only
- Change default passwords in production
- Never commit passwords to version control
- Use environment variables for sensitive data

---

## Next Steps

After creating accounts:
1. Test login in your apps
2. Verify Firestore documents were created
3. Test authentication flows
4. Integrate into your app's UI

