# App Store privacy & review checklist (civilian app)

Use this when completing **App Store Connect → App Privacy** and **App Review Information**.

## Privacy Policy URL (required)

```
https://www.resq-link.com/privacy-policy
```

Also available in-app: **Profile → Privacy & Security → Privacy policy**

## App Privacy nutrition labels (recommended answers)

Declare data **linked to the user** unless you use anonymous-only analytics with no account tie-in.

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| Name | Yes | Yes | No | App functionality, account management |
| Email address | Yes | Yes | No | App functionality, account management |
| Phone number | Yes | Yes | No | App functionality |
| Physical address | Yes | Yes | No | App functionality |
| User ID | Yes | Yes | No | App functionality |
| Precise location | Yes | Yes | No | App functionality |
| Photos or videos | Yes | Yes | No | App functionality (KYC ID + incident attachments) |
| Other user content | Yes | Yes | No | App functionality (incident reports) |
| Crash data | Yes | Yes* | No | Analytics / app functionality |
| Performance data | Yes | Yes* | No | Analytics / app functionality |

\* If Firebase/Crashlytics ties diagnostics to authenticated users, mark as linked. If purely anonymous, you may mark not linked.

**Do not declare:** Contacts, browsing history, purchases, health, financial info, microphone (removed with Agora).

**Sensitive:** Government ID photo — disclose under **Photos or videos** and **User content**; explain KYC in App Review notes.

## App Review Information (paste into Notes)

```
DEMO ACCOUNT (pre-approved KYC — approve in Super Admin before submission):
  Email: civilian@test.com
  Password: (your demo password — enter only in App Store Connect, not in git)
  Firestore users/{uid} status must be: active
  Approve at: https://www.resq-link.com/admin/kyc (super-admin login required)

KYC / ID VERIFICATION:
  New users submit a government ID photo at registration. Accounts stay on
  "Account under review" until a super-admin approves KYC in the web admin
  console (/admin/kyc). The demo account above bypasses this for review.

  Privacy policy: https://www.resq-link.com/privacy-policy
  Data privacy notice: https://www.resq-link.com/data-privacy

PERMISSIONS:
  - Location: attach coordinates to emergency reports; optional address fill at registration
  - Camera / Photo library: government ID verification (KYC) and optional incident photos

EMERGENCY DISCLAIMER:
  RESQ-Link coordinates reports with local dispatch; it does not replace calling 911.
  "Call 911" opens the device phone dialer.

No in-app voice calling (Agora removed).
```

## Before you submit

1. Deploy web app so live URLs serve the new legal pages (not placeholders).
2. Create and **approve** a reviewer Firebase account before filling App Review Information.
3. Run `npx expo prebuild --clean` or EAS build so `Info.plist` picks up camera/photo strings from `app.json`.
4. Confirm `PrivacyInfo.xcprivacy` matches declared data types after prebuild.

## Legal disclaimer

These documents were drafted for RESQ-Link operational and App Store compliance. Have institutional legal counsel review before production launch, especially NPC registration if required for your scale of processing.
