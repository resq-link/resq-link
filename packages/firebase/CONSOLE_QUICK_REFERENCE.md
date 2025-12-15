# Firebase Console Quick Reference

Quick steps to create accounts in Firebase Console.

---

## 🚀 Quick Steps

### 1. Enable Authentication Providers

**Firebase Console → Authentication → Sign-in method**
- ✅ Enable **Email/Password**
- ✅ Enable **Phone**

---

## 2. Create Dispatcher Accounts

### Authentication (5 accounts)

**Firebase Console → Authentication → Users → Add user**

| Email | Password |
|-------|----------|
| `bfp@rescue.ph` | `BFP2024!` |
| `pnp@rescue.ph` | `PNP2024!` |
| `mdrrmo@rescue.ph` | `MDRRMO2024!` |
| `ambulance@rescue.ph` | `AMBULANCE2024!` |
| `pcg@rescue.ph` | `PCG2024!` |

**⚠️ Important:** Copy the **User UID** for each account!

### Firestore (5 documents)

**Firestore Database → Start collection → `dispatchers`**

For each dispatcher, add document:
- **Document ID**: User UID from Authentication
- **Fields**:
  - `email`: (same as auth email)
  - `role`: `BFP` | `PNP` | `MDRRMO` | `AMBULANCE` | `PCG`
  - `createdAt`: timestamp (now)
  - `active`: boolean (true)

---

## 3. Create Command Center Accounts

### Authentication (3 accounts)

**Firebase Console → Authentication → Users → Add user**

| Email | Password |
|-------|----------|
| `manila@commandcenter.ph` | `Manila2024!` |
| `quezon@commandcenter.ph` | `Quezon2024!` |
| `makati@commandcenter.ph` | `Makati2024!` |

**⚠️ Important:** Copy the **User UID** for each account!

### Firestore (3 documents)

**Firestore Database → Start collection → `commandCenters`**

For each command center, add document:
- **Document ID**: User UID from Authentication
- **Fields**:
  - `email`: (same as auth email)
  - `name`: `Manila Command Center` | `Quezon City Command Center` | `Makati Command Center`
  - `location`: `Manila, Philippines` | `Quezon City, Philippines` | `Makati, Philippines`
  - `createdAt`: timestamp (now)

---

## 4. User Accounts (Phone Auth)

**Note:** User accounts are created when users sign in via phone in your app.

After a user signs in:
1. Go to **Authentication → Users**
2. Find the user (identified by phone number)
3. Copy the **User UID**
4. Go to **Firestore → `users` collection**
5. Add document with User UID as document ID:
   - `phone`: (phone number)
   - `fullName`: (user's name)
   - `address`: (user's address)
   - `createdAt`: timestamp

---

## 📝 Field Reference

### Dispatcher Document
```
email: string
role: string (BFP, PNP, MDRRMO, AMBULANCE, PCG)
createdAt: timestamp
active: boolean (true)
```

### Command Center Document
```
email: string
name: string
location: string
createdAt: timestamp
```

### User Document
```
phone: string
fullName: string
address: string
createdAt: timestamp
```

---

## ✅ Checklist

- [ ] Email/Password auth enabled
- [ ] Phone auth enabled
- [ ] 5 dispatcher accounts created in Authentication
- [ ] 5 dispatcher documents in Firestore
- [ ] 3 command center accounts created in Authentication
- [ ] 3 command center documents in Firestore
- [ ] All Firestore documents use correct User UID as document ID

---

## 🎯 That's It!

Your accounts are ready to use. Test login in your apps!

