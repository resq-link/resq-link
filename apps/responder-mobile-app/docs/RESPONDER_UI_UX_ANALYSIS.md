# RESQ-LINK Responder Mobile App — UI/UX Analysis

**Date:** August 24, 2026  
**Scope:** Analysis only — no code changes  
**Reference app:** Civilian Mobile App (`apps/civilian-mobile-app`)  
**Subject app:** Responder Mobile App (`apps/responder-mobile-app`)

---

## 1. Executive Summary

The Civilian Mobile App presents a cohesive, Apple-influenced design language with consistent typography, spacing, card craftsmanship, and motion. It feels like a finished consumer product. The Responder Mobile App has a well-documented token system (`resqTokens.js`) and strong operational workflow logic, but **tokens are applied inconsistently**, key screens mix hardcoded colors with theme values, and the most important screen (`CaseInfoCard.jsx`, ~1,578 lines) has grown into a monolith that prioritizes feature completeness over visual clarity.

**Core finding:** The Responder app does not lack a design system — it lacks **disciplined application** of its own system and **shared primitives** with Civilian where appropriate. Civilian feels polished because every screen follows the same hierarchy rules: one primary action, restrained surfaces, predictable spacing, and loading/empty states that mirror real content. Responder often stacks decorative gradients, competing stat cards, and multiple CTAs without a clear "what do I do next?" focal point.

**Top priorities for future redesign (no implementation in this document):**

| Priority | Issue | Impact |
|----------|-------|--------|
| **P0** | Dashboard does not foreground the assigned incident and next action | Operational confusion under time pressure |
| **P0** | Accept failure on dashboard cards is silent (`console.error` only) | Responder may think case was accepted |
| **P0** | `CaseDetailSkeleton` layout does not match map-first detail UI | Jarring load transition; perceived slowness |
| **P1** | Priority colors inconsistent (`CaseCard` purple vs theme orange for High) | Wrong urgency signals |
| **P1** | Dual `<Toaster />` mounts (`App.tsx` + `_layout.jsx`) | Risk of duplicate toasts / context issues |
| **P1** | Scene Assessment vs Post Report visual distinction is weak | "What we found" vs "What we did" not obvious |
| **P2** | Dashboard hero visual density (gradient + SVG + identity + stats + duty) | Competes with incident list |
| **P2** | Hardcoded hex values bypass `useResqTheme()` across incident cards | Breaks light/dark consistency |

**Recommended direction:** Keep Responder's deep navy / rescue blue operational identity. Adopt Civilian's **spacing discipline, typography scale, card structure, and feedback patterns** — not its green consumer branding. Responder should feel like the professional sibling: calm, high-contrast, fast, and action-oriented.

---

## 2. Civilian App Design Analysis

### 2.1 Architecture

| Aspect | Implementation |
|--------|----------------|
| Router | Expo Router — root Stack + `(auth)`, `(main)`, `(settings)` groups |
| Navigation | Custom `CustomBottomNav` mounted globally (4 tabs: Home, Map, History, Settings) |
| Theme | `AppThemeProvider` + `createBaseColors()` semantic tokens, light/dark/system |
| Typography | Inter 400/600/700 via `@expo-google-fonts/inter` |
| Icons | `lucide-react-native`, 22px nav, stroke 2 |
| Animation | `react-native-reanimated` — nav pill, card press, list stagger, SOS pulse |

### 2.2 Screen Inventory

| Route | File | Purpose | Primary action | Navigation |
|-------|------|---------|----------------|------------|
| `/` | `src/app/index.jsx` → `SplashGateScreen` | Onboarding + auth gate | Continue / Sign in | Auto-redirect |
| `/login` | `(auth)/login.jsx` | Email/password sign-in | Sign in | Stack |
| `/register` | `(auth)/register.jsx` | 3-step signup + KYC ID | Continue per step | Stack wizard |
| `/forgot-password` | `(auth)/forgot-password.jsx` | Password reset request | Send reset | Stack |
| `/forgot-password-otp` | `(auth)/forgot-password-otp.jsx` | OTP verification | Verify | Stack |
| `/reset-password` | `(auth)/reset-password.jsx` | Set new password | Save | Stack |
| `/email-verification` | `(auth)/email-verification.jsx` | Email OTP gate | Verify | Stack |
| `/account-pending` | `(auth)/account-pending.jsx` | KYC review wait | Refresh status | Stack |
| `/dashboard` | `(main)/dashboard.jsx` | Home hub | Report Emergency | Bottom nav Home |
| `/emergency-form` | `(main)/emergency-form.jsx` | 5-step report wizard | Continue / Submit | Push (nav hidden) |
| `/emergency-confirmation` | `(main)/emergency-confirmation.jsx` | Live incident status | View history / Back | Push |
| `/responder-map` | `(main)/responder-map.jsx` | Live map + timeline sheet | Report at pin | Bottom nav Map |
| `/(tabs)/history` | `(main)/(tabs)/history.jsx` | Searchable history | Open incident | Bottom nav History |
| `/(tabs)/profile` | `(main)/(tabs)/profile.jsx` | Settings hub | Open setting row | Bottom nav Settings |
| `/advisories` | `(main)/advisories.jsx` | Public advisories | Read advisory | Push from dashboard |
| `/advisory-detail` | `(main)/advisory-detail.jsx` | Advisory detail | — | Push |
| `/appearance` | `(settings)/appearance.jsx` | Theme picker | Select theme | Stack |
| `/notifications` | `(settings)/notifications.jsx` | Push toggles | Save | Stack |
| `/privacy-security` | `(settings)/privacy-security.jsx` | Privacy settings | — | Stack |
| `/help-support` | `(settings)/help-support.jsx` | Help center | — | Stack |
| `/report-issue` | `(settings)/report-issue.jsx` | In-app feedback | Submit | Stack |
| `/faq` | `(settings)/faq.jsx` | FAQ accordion | — | Stack |

**Global overlays:** `SOSConfirmationModal`, `ShakeSOSListener`, `AdvisoryBanner`

### 2.3 Design Tokens (Civilian)

**Colors** (`src/theme/colors.js`):
- Background: `#F5F5F7` / `#0D0F12`
- Surface/card: `#FFFFFF` / `#1F242B`
- Primary (brand green): `#34C759` / `#7CFF4D`
- Emergency red: `#FF3B30`
- Text hierarchy: `#111111` / `#66666E` / `#8E8E93` (light)

**Spacing:** 8px base grid; screen padding 16–24px; touch targets ≥44px  
**Radius:** inputs/buttons 12px; cards 16–20px; modals 24px; pills 999px  
**Typography scale:** badge 10–12 → body 15–16 → section 17–20 → title 24 → display 32–42

### 2.4 Shared Component Library

| Component | Role |
|-----------|------|
| `CustomBottomNav` | Animated 4-tab bar, active pill, Reanimated press scale |
| `CustomButton` | Primary/secondary, 50px height, radius 12 |
| `FormInput` | Labeled input, focus border, password toggle |
| `LoadingScreen` | Full-screen spinner + title/subtitle |
| `SuccessScreen` | Checkmark success state |
| `ErrorAlert` | Inline dismissible error banner |
| `StatusBadge` / `IncidentStatusIndicator` | Pulsing status dot + label |
| `PremiumIncidentCard` | History card with telemetry stripe, structured metadata |
| `AttachmentPicker` | Dual upload cards (Camera/Gallery), thumbnail grid |
| `SubmittingOverlay` | Modal progress during emergency submit |

### 2.5 Civilian Strengths (Why It Feels Polished)

1. **Single visual hierarchy per screen** — Dashboard hero card dominates; everything else is secondary. One obvious primary action per view.
2. **Card craftsmanship** — `PremiumIncidentCard` uses a 5px telemetry stripe, callsign row, status chip, and metadata in fixed vertical order. Cards feel designed, not templated.
3. **Typography discipline** — Inter weight pairing (400 body / 600 labels / 700 titles) with negative letter-spacing on headlines. No random font sizes.
4. **Motion with purpose** — Nav pill transitions, card press scale (`usePressScale`), list `FadeInDown` stagger. Respects reduce-motion on emergency steps.
5. **Loading states match content** — `HistorySkeleton` mirrors card anatomy (stripe, callsign bone, chips). No generic spinners where structure helps.
6. **Empty states with CTAs** — History empty state offers "Report New Emergency"; map sheet shows "You're Safe" with report CTA.
7. **Form wizards** — Register (3 steps) and Emergency (5 steps) use `ReportProgress`, `BottomActionBar`, and disabled Continue until valid.
8. **Accessibility** — `accessibilityRole`, `accessibilityLabel`, `accessibilityState` on nav and CTAs; 44px touch targets.

---

## 3. Responder App Design Analysis

### 3.1 Architecture

| Aspect | Implementation |
|--------|----------------|
| Router | Expo Router — root Stack + `(tabs)` (3 visible) + `incident/[id]` + `support/*` |
| Navigation | Custom `MainTabBar` — floating BlurView pill (Dispatch, Map, Profile) |
| Theme | `ResqThemeProvider` + `darkResqTokens` / `lightResqTokens` + dashboard/map themes |
| Typography | Inter 400/500/600/700 |
| Icons | `lucide-react-native` |
| Toasts | `sonner-native` — **only** scene assessment + post report actions |

### 3.2 Screen Inventory

| Route | File | Purpose | Primary action | Navigation |
|-------|------|---------|----------------|------------|
| `/` | `index.jsx` → `AuthIndexGate` | Auth gate | — | `replace` → login or dashboard |
| `/login` | `(auth)/login.jsx` → `LoginView` | Dispatcher sign-in | Sign in | Full-screen |
| `/dashboard` | `(tabs)/dashboard.jsx` → `DashboardView` | Mission home | Open incident / Accept | Tab: Dispatch |
| `/map` | `(tabs)/map.jsx` → `ResponderMapExplorer` | Map + incident sheet | Navigate / Open detail | Tab: Map |
| `/settings` | `(tabs)/settings.jsx` → `SettingsView` | Profile & settings | Open row | Tab: Profile |
| `/notifications` | `(tabs)/notifications.jsx` → `NotificationsView` | Alert toggles | Save | Hidden tab; from Settings |
| `/incident/:id` | `incident/[id].jsx` → `CaseDetailView` | Full incident workflow | Accept / Touchdown / Assess / Report | Stack push |
| `/support/about` | `support/about.jsx` | App info | — | Stack |
| `/support/privacy-security` | `support/privacy-security.jsx` | Privacy | — | Stack |
| `/support/location` | `support/location.jsx` | GPS help | — | Stack |
| `/support/help-support` | `support/help-support.jsx` | Help | — | Stack (not linked from Settings rows) |

**Global overlays:** `PriorityAlertProvider` → `IncidentAlertModal`, `ResponderMessagingWidget`, `Toaster`

### 3.3 Design Tokens (Responder)

**Foundation** (`src/theme/tokens/resqTokens.js`):
- Deep Emergency Blue: `#0B1F3A`, `#132A4A`, `#1E3A5F`
- Bright Rescue Blue (accent): `#2563EB`, `#3B82F6`, `#60A5FA`
- Emergency Red (critical only): `#DC2626`, `#EF4444`
- Dark bg: `#03060E`; surface: `#0B1526`; surfaceCard: `#101E34`
- Workflow: pending `#F59E0B`, enroute `#3B82F6`, onScene `#EA580C`, done `#16A34A`

**Spacing** (`src/theme/index.ts`): xs=4, sm=8, md=12, lg=16, xl=20, xxl=24  
**Radii:** sm=6, md=8, lg=12, xl=16

### 3.4 Responder Component Inventory

| Component | Role | Notes |
|-----------|------|-------|
| `MainTabBar` | 3-tab floating BlurView nav | 360px max width, labels differ from routes |
| `DashboardView` | Hero + stats + duty + incident list | Heavy gradient/SVG decoration |
| `CaseCard` | Dashboard incident card | Hardcoded colors; inline accept |
| `CaseInfoCard` | Incident detail + full workflow | ~1,578 lines; map-first sheet |
| `CaseDetailSkeleton` | Loading placeholder | **Layout mismatch** with actual detail |
| `SceneAssessmentModal` | Assessment form (pageSheet) | Plain TextInputs |
| `PostReportModal` | Post-incident form (bottom sheet) | Preset chips, progress strip |
| `SceneAssessmentSection` | Read-only assessment display | Uppercase label rows |
| `IncidentPhotoField` | Camera/gallery upload | Shared by assessment + post report |
| `DutyResourceCard` | On/off duty + unit picker | Uses `fontWeight` strings in places |
| `PriorityBadge` | Theme-driven priority chip | Correct token usage |
| `StickyActionBar` | — | **Dead code**, never imported |
| `DetailHeader`, `CaseMapSection` | — | **Dead code** |

---

## 4. Civilian vs Responder Comparison

| Element | Civilian | Responder | Recommendation |
|---------|----------|-----------|----------------|
| **Header** | Greeting + name + date; minimal chrome | Brand hero + gradient + SVG decor + Live badge | Responder: compress hero; put identity in compact bar |
| **Cards** | 16px radius, 1px border, telemetry stripe, structured rows | 20px radius, 5px accent bar, mixed hardcoded colors | Align to 16px radius; use token colors only; adopt stripe + row hierarchy |
| **Buttons** | 50px height, 12px radius, primary/secondary clear | Pill CTAs (999 radius) in action panel; mixed styles | Primary 48–52px, radius 12; one full-width primary per state |
| **Typography** | Feature scales but consistent Inter weights | Inter families + occasional `fontWeight` strings | Single shared type scale; always use Inter family names |
| **Navigation** | Full-width bar, rounded top, animated pill, 4 tabs | Floating BlurView pill, 3 tabs, high elevation | Keep floating pill (operational distinction) but match Civilian label sizing and active state clarity |
| **Modals** | Transparent modal (SOS), bottom sheet (map) | pageSheet (Scene Assessment), bottom sheet (Post Report), centered (Decline, Alert) | Standardize: operational forms = bottom sheet; confirmations = centered alert |
| **Status badges** | Pulsing dot + uppercase label | `IncidentStatusIndicator` + `PriorityBadge` | Shared badge component from `@packages/firebase` — enforce token colors |
| **Forms** | Step wizard + progress bar + bottom action bar | Scene Assessment = plain inputs; Post Report = chips (better) | Bring Post Report chip pattern to Scene Assessment; shared form shell |
| **Spacing** | 8px grid, 16–24px screen margins | Token spacing exists but arbitrary inline values in `CaseInfoCard` | Enforce spacing tokens; audit inline margins |
| **Icons** | lucide 22px, stroke 2, consistent | lucide mixed 13–22px | Standardize: nav 22, inline 16, section 18 |
| **Loading states** | Skeleton matches card layout | Dashboard spinner; detail skeleton **wrong layout** | Map-first skeleton for detail; subtle spinner elsewhere |
| **Toasts** | None — `Alert.alert` + inline banners | `sonner-native` for 2 flows only; duplicate Toaster | Single Toaster; extend to accept/duty/photo errors |
| **Empty states** | Contextual CTA, compact icon shell | Dashboard pulse orb (good); map sheet adequate | Keep compact; avoid large illustrations |
| **Brand color** | Green `#34C759` / `#7CFF4D` | Rescue blue `#3B82F6` | Keep distinct; shared neutral surfaces only |
| **Photo upload** | Dual large upload cards + thumbnail grid | Side-by-side Take/Choose buttons, 200px preview | Add purpose labels; distinguish civilian vs on-scene vs action photos visually |

---

## 5. Current Responder Design Problems

### 5.1 System-Level

1. **Token system exists but is bypassed** — `CaseCard.jsx` hardcodes `#101E34`, `#7C3AED` (high priority purple), `#DC2626` instead of `colors.priorityHigh` etc.
2. **Monolithic incident detail** — All workflow UI, styles (~400 lines inline `StyleSheet.create`), and sections live in `CaseInfoCard.jsx`.
3. **Dead UI code** — `StickyActionBar`, `DetailHeader`, `CaseMapSection` (~980 lines) create confusion for future work.
4. **Dual toast mounts** — `App.tsx` line 46 and `_layout.jsx` line 97 both render `<Toaster />`.
5. **Font inconsistency** — `SpaceGrotesk` referenced in map error UI but never loaded; `DutyResourceCard` uses `fontWeight: "600"` instead of `Inter_600SemiBold`.

### 5.2 Experience-Level

1. **Dashboard answers "who am I?" before "what incident am I on?"** — Hero, identity card, 3 stat cards, and duty card appear above the incident list.
2. **Incident cards lack distance/time prominence** — Type and badges compete; location/time are footer metadata, not headline support.
3. **Detail screen information order ≠ workflow order** — Content scroll order: Description → Civilian Photo → Post Report (read) → Additional Details → Scene Assessment → Reporter → Timeline. Workflow actions are in fixed bottom panel (correct) but scroll content doesn't reinforce the pipeline.
4. **Scene Assessment feels generic** — Plain `TextInput` fields vs Post Report's preset chips and section icons.
5. **Feedback inconsistency** — Accept on dashboard: silent failure. Touchdown: `ErrorAlert` only. Assessment/Report: toast + ErrorAlert. Settings save: `Alert.alert`.

---

## 6. Screen-by-Screen Review (Responder)

### 6.1 Authentication — `/login` (`LoginView.jsx`)

| Aspect | Assessment |
|--------|------------|
| Purpose | Dispatcher email/password sign-in |
| Primary action | Sign in |
| Hierarchy | Logo → form → legal links |
| Components | Gradient background, SVG decor, `FormInput`, `ErrorAlert` |

**Score: 7/10** — Visually polished (matches Civilian auth quality). Soft error presentation. Blank `AuthIndexGate` during routing (no spinner) feels abrupt.

---

### 6.2 Dashboard — `/dashboard` (`DashboardView.jsx`)

| Aspect | Assessment |
|--------|------------|
| Purpose | Mission overview, duty status, assigned incidents |
| Primary action | Open assigned incident (should be); currently competes with stats/duty |
| Secondary | Toggle duty, pull-to-refresh, accept inline on card |
| Components | Gradient hero, SVG decor, identity card, 3 stat gradient cards, `DutyResourceCard`, `CaseCard` list |

**Evaluation against responder questions:**

| Question | Can responder answer immediately? |
|----------|-----------------------------------|
| What incident am I assigned to? | **Partially** — must scroll past hero/stats/duty |
| How urgent is it? | **Partially** — priority badge on card, not dashboard-level |
| Where is it? | **No** — not on dashboard; must open card |
| What do I need to do next? | **No** — no "Accept" / "En Route" / "Touchdown" summary |

**Score: 5/10** — Strong branding but operational clarity is buried. Too many decorative layers (gradient + SVG + identity gradient + stat gradients) before actionable content.

---

### 6.3 Map — `/map` (`ResponderMapExplorer.jsx`)

| Aspect | Assessment |
|--------|------------|
| Purpose | Spatial view of incidents, navigate, open detail |
| Primary action | Select incident chip → Navigate or View |
| Components | Full-screen map, filter chip header, GPS FAB, draggable bottom sheet |

**Score: 6/10** — Functional and appropriate for responders. Map-unavailable text references unloaded SpaceGrotesk font. Sheet interaction is good; visual polish below Civilian map sheet.

---

### 6.4 Incident Detail — `/incident/:id` (`CaseInfoCard.jsx`)

| Aspect | Assessment |
|--------|------------|
| Purpose | Complete incident workflow |
| Primary action | State-dependent: Accept → Touchdown → Scene Assessment → Post Report |
| Layout | Map (~360px) + overlapping bottom sheet + fixed action panel |
| Sections | Description, Photo, Post Report, Additional Details, Scene Assessment, Reporter, Timeline |

**Workflow presentation:**

```
Incident info (scroll)     ← static content mixed with workflow artifacts
     ↓
Action panel (fixed)       ← correct gating logic
  Accept/Decline
  Touchdown
  Scene Assessment
  Post Report
  Completed
```

**Score: 6/10** — Workflow logic is sound; UI is crowded. Map-first layout is good for navigation context. Scroll content order doesn't mirror workflow. Bottom panel can stack 3+ buttons in "On Scene" state.

---

### 6.5 Notifications — `/notifications` (`NotificationsView.jsx`)

| Aspect | Assessment |
|--------|------------|
| Purpose | Toggle case alerts and status reminders |
| Primary action | Save |
| Issue | Settings stored in AsyncStorage only — **not wired to `PriorityAlertProvider`** |

**Score: 4/10** — Functional UI but misleading (toggles don't affect alert behavior). Hidden from tab bar; discoverability via Settings only.

---

### 6.6 Settings / Profile — `/settings` (`SettingsView.jsx`)

| Aspect | Assessment |
|--------|------------|
| Purpose | Profile, appearance, location, notifications, about, logout |
| Primary action | Navigate to sub-screen |
| Issues | Profile/unit editing shows `Alert.alert` stubs; tab labeled "Profile" but route is `settings` |

**Score: 6/10** — Appearance and location screens are adequate. Profile editing incomplete.

---

### 6.7 Support Screens — `/support/*`

**Score: 5/10** — Standard list/detail patterns. `help-support` route exists but isn't linked from Settings navigation rows.

---

## 7. Navigation Review

### Civilian (`CustomBottomNav`)

- Full-width bar, rounded top corners (20px phone)
- 76px content height + safe area
- Reanimated active pill, icon scale 1.06, press scale 0.94
- Hidden on auth, emergency flow, settings sub-screens
- 4 tabs with clear labels matching purpose

### Responder (`MainTabBar`)

- Floating centered pill (360px max, 64px min height, 32px radius)
- BlurView + glass overlay, elevation 14
- 3 tabs: Dispatch, Map, Profile
- `notifications` registered but `href: null` (hidden)

### Comparison & Recommendations

| Aspect | Civilian | Responder | Recommendation |
|--------|----------|-----------|----------------|
| Position | Bottom flush | Floating +10px inset | Keep floating for operational feel |
| Active state | Animated pill fill | Background tint on icon button | Adopt Civilian pill animation clarity |
| Labels | 10px, letterSpacing 0.05 | 10px SemiBold | Match exactly |
| Safe area | Dedicated inset utility | `insets.bottom + 10` | Shared safe-area helper |
| Icon size | 22px | 22px | ✓ Aligned |
| Back navigation | Circular back button (44px) | Floating back on map overlay | Standardize header back pattern |

**Do not change route architecture.** Visual alignment only.

---

## 8. Typography Review

### Civilian Scale (representative)

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Screen title | 24–42 | Bold | Settings, auth |
| Section title | 17–20 | Bold | Dashboard sections |
| Card title | 15 | SemiBold | History cards |
| Body | 15–16 | Regular | Descriptions |
| Caption/metadata | 12–13 | Regular | Timestamps, hints |
| Badge/status | 10–12 | SemiBold, uppercase | Status chips |

### Responder Issues

| Issue | Location | Example |
|-------|----------|---------|
| Oversized brand title in hero | `DashboardView` | "RESQ Responders" display scale |
| Uppercase overload | `SceneAssessmentSection` | All field labels uppercase + letterSpacing 0.8 |
| Inline font sizes | `CaseInfoCard` | Ad-hoc 15px, 12px, 24px in JSX |
| `fontWeight` vs family | `DutyResourceCard`, `IncidentAlertModal` | `"600"` instead of `Inter_600SemiBold` |
| Unloaded font reference | `ResponderMapExplorer` | SpaceGrotesk |

### Recommended Shared Typography Scale

```
display    28  Inter_700Bold     — screen heroes (use sparingly)
title      20  Inter_700Bold     — screen titles
heading    17  Inter_600SemiBold — section headers
body       15  Inter_400Regular  — primary content
label      13  Inter_600SemiBold — form labels
caption    12  Inter_400Regular  — metadata, timestamps
badge      11  Inter_600SemiBold — status chips (uppercase, letterSpacing 0.4)
micro      10  Inter_600SemiBold — nav labels
```

---

## 9. Color Review

### Brand Relationship

| Token | Civilian | Responder | Shared? |
|-------|----------|-----------|---------|
| Primary accent | Green `#34C759` | Blue `#3B82F6` | **No** — intentional differentiation |
| Emergency/critical | `#FF3B30` | `#DC2626` | **Yes** — align critical red |
| Success | `#34C759` | `#16A34A` / `#22C55E` | Close enough — pick one success green |
| Warning | `#FF9F0A` | `#F59E0B` | **Yes** |
| Background (dark) | `#0D0F12` | `#03060E` | Responder darker/navier — OK |
| Surface (dark) | `#1F242B` | `#101E34` | Different but both valid |
| Text secondary | `#A5ADB8` | `#94A3B8` | **Yes** — can unify neutrals |
| Border | `rgba(255,255,255,0.08)` | `rgba(45,62,95,0.40)` | Responder borders heavier — lighten for cards |

### Priority Colors (must fix)

| Priority | Theme (`priorityHigh`) | `CaseCard` accent bar | `PriorityBadge` |
|----------|------------------------|----------------------|-----------------|
| Critical | `#DC2626` | `#DC2626` ✓ | theme ✓ |
| High | `#EA580C` (orange) | `#7C3AED` (purple) ✗ | theme ✓ |
| Medium | theme | `#EAB308` | theme ✓ |
| Low | theme | `#10B981` | theme ✓ |

**Recommendation:** Use theme tokens everywhere. Purple for High priority is misleading (reads as informational, not urgent).

### Status Colors (workflow)

Use intentionally, not decoratively:
- **Pending/Awaiting:** amber `#F59E0B`
- **En Route:** blue `#3B82F6`
- **On Scene:** orange `#EA580C`
- **Resolved:** green `#16A34A`
- **Critical priority:** red `#DC2626` — sparingly on badges/borders only

---

## 10. Spacing Review

### Token Alignment

Both apps effectively use an **8px base grid**. Responder tokens (4/8/12/16/20/24) are compatible with Civilian (8/16/20/24).

### Inconsistencies Found (Responder)

| Location | Issue |
|----------|-------|
| `CaseCard` | `borderRadius: 20` vs theme `radii.lg` (12) |
| `CaseInfoCard` | Inline margins (e.g., `marginTop: -34` sheet overlap) |
| Dashboard hero | Multiple nested padding values not from tokens |
| `SceneAssessmentModal` | Consistent token usage ✓ |
| Action panel | Variable height 120–200px depending on button count |

### Recommended Shared Spacing Scale

```
xs:  4   — icon gaps, tight label spacing
sm:  8   — inline element gaps
md:  12  — form field spacing
lg:  16  — card padding, screen horizontal margin
xl:  20  — section gaps
xxl: 24  — major section separation
xxxl: 32 — screen top padding (hero)
```

---

## 11. Component Review

### Cards and Surfaces

**Civilian pattern:** Single surface, 1px border, subtle shadow, optional 5px stripe. No nested gradient cards except hero CTA.

**Responder issues:**
- Cards inside gradient cards on dashboard (identity card inside hero gradient)
- Stat cards with their own gradient fills (3 competing accents)
- `CaseInfoCard` sheet sections use `embedded={true}` Section components — reasonable, but combined with map + progress tracker + action panel feels layered

**Desired direction:** clean, professional, operational, modern, restrained — **not** excessive gradients, glassmorphism, or floating decorative elements.

### Buttons

| Type | Civilian | Responder | Target |
|------|----------|-----------|--------|
| Primary | Filled, 50px, radius 12 | Pill 999, accent fill | 48px height, radius 12, full-width in action panel |
| Secondary | Bordered surface | Red-outline Decline, outline assessment update | Consistent outline style |
| Destructive | Red gradient (SOS) | Red-outline Decline | Keep outline for Decline (not gradient) |
| Disabled | Reduced opacity + muted bg | Opacity 0.5 + separate disabled post report style | Unified disabled pattern |

### Icons

- Both use `lucide-react-native` ✓
- **Standardize sizes:** nav 22 / section header 18 / inline 14–16 / badge 8
- **Stroke:** 2 (2.25 active)
- **No emojis as UI icons** — both apps comply ✓
- Remove SpaceGrotesk reference; stick to Inter + lucide

---

## 12. Forms and Modal Review

### Modal Patterns (Current)

| Modal | Presentation | Used for |
|-------|-------------|----------|
| `SceneAssessmentModal` | iOS pageSheet, slide | Scene assessment create/update |
| `PostReportModal` | Transparent bottom sheet, 72–92% height | Post-incident report |
| `DeclineModal` | Centered | Decline reason |
| `IncidentAlertModal` | Centered, blocking | Priority assignment alarm |
| Photo viewer | Fade, full-screen dark | Image preview |

**Recommendation:** Operational data entry (Assessment, Post Report) should share one **bottom sheet shell** with drag handle, matching Post Report (the stronger pattern).

### Scene Assessment Form

| Aspect | Current | Issue |
|--------|---------|-------|
| Fields | Dynamic from `getSceneAssessmentFieldDefs` | ✓ Good |
| Layout | Stacked TextInputs, 44px min height | Generic mobile form |
| Labels | 13px SemiBold | OK |
| Photo | `IncidentPhotoField` | OK but same visual as action photo |
| Validation | Submit disabled until one field has text | No field-level indicators |
| Cancel | X button only | OK |
| Keyboard | KeyboardAvoidingView | OK |

### Post Report Form

| Aspect | Current | Issue |
|--------|---------|-------|
| Presets | Cause, notes, status, hospital chips | ✓ Excellent for field use |
| People counter | +/- stepper | ✓ Good |
| Progress | "X/3 key details filled" | Doesn't include photo/people count |
| Validation | None on submit | Can submit empty |
| Footer | Cancel + "Complete Case" | ✓ Clear |

---

## 13. Incident Workflow UX Review

### Intended Workflow

```
Incident → Navigate → Touchdown → Scene Assessment → Response Ops → Post Report → Resolved
```

### Current UI Mapping

| Stage | UI location | Clarity |
|-------|-------------|---------|
| Incident | Map + sheet title/badges | Good |
| Navigate | Floating Google Maps button on map | Good |
| Accept/En Route | Action panel + 3-step progress tracker | Good |
| Touchdown | Primary CTA in action panel | Good prominence |
| Scene Assessment | Action panel button → pageSheet modal | Moderate |
| Post Report | Action panel button → bottom sheet | Good; gated correctly |
| Resolved | BlurView "Case Completed" panel | Good |

### Gating Logic (correct — preserve in redesign)

- Post Report blocked until Scene Assessment submitted ✓
- Touchdown required before assessment ✓
- `toast.message("Complete Scene Assessment first")` on blocked Post Report ✓

### Information Order Problem

Scroll content shows **Post Report (read-only)** before **Scene Assessment** section when both exist. This reverses the conceptual "found → did" narrative.

**Recommended scroll order:**
1. Incident summary (type, priority, status, location)
2. Civilian description + scene photo
3. Reporter info (if permitted)
4. Scene Assessment (what we found)
5. Post Report (what we did)
6. Additional details
7. Timeline (collapsed default)

---

## 14. Scene Assessment Review

### Files

- `SceneAssessmentModal.jsx` — entry/edit form
- `SceneAssessmentSection.jsx` — read-only display in detail
- `CaseInfoCard.jsx` — orchestration, action panel trigger

### Strengths

- Dynamic fields per incident type
- Optional on-scene photo with replace note
- Update flow reuses same modal
- Toast success/error feedback

### Weaknesses

| Issue | Priority |
|-------|----------|
| Plain TextInput form vs Post Report chips | P1 |
| pageSheet vs bottom sheet inconsistency | P2 |
| Uppercase labels in read view feel harsh | P2 |
| No upload progress indicator during submit | P1 |
| Photo purpose label "On-Scene Photo" OK but same component as action photo | P2 |

### Does it feel operational?

**Partially.** Intro copy ("Document on-scene conditions for dispatch") helps. Field layout is functional but could use grouped sections (e.g., "Conditions", "Resources", "Remarks") and quick-select presets where applicable (Post Report pattern).

---

## 15. Post Report Review

### Distinction from Scene Assessment

| Aspect | Scene Assessment | Post Report |
|--------|------------------|-------------|
| Modal style | pageSheet | Bottom sheet |
| Input pattern | Free text | Presets + free text |
| Photo label | "On-Scene Photo" | "Action Photo" |
| Visual weight | Lighter | Richer (sections, icons, progress) |
| Read view | Uppercase row cards | Plain text lines |

**Verdict:** Post Report ** feels more polished and operational**. Scene Assessment feels like a generic form. The conceptual distinction ("found" vs "did") is **not clear enough** because:
1. Different modal presentations
2. Read views use different styling but similar plain-text patterns
3. Photo fields look identical (`IncidentPhotoField`)

### Recommendations (future)

- Scene Assessment: adopt section headers with icons (Post Report pattern)
- Read views: Scene Assessment = neutral surface; Post Report = subtle green-tinted "closure" surface
- Photo labels: add purpose badges — "CIVILIAN SCENE" / "ON-SCENE" / "ACTION"

---

## 16. Photo/Media UX Review

### Three Photo Purposes

| Purpose | Source | Display in Responder | Upload |
|---------|--------|---------------------|--------|
| Civilian Scene Photo | Reporter at intake | `CaseInfoCard` Section "Photo", cover, 200px | Read-only |
| Responder On-Scene Photo | Scene Assessment | `SceneAssessmentSection`, contain, 200px | `IncidentPhotoField` in modal |
| Responder Action Photo | Post Report | Post Report section, contain, 200px | `IncidentPhotoField` in modal |

### Upload Component (`IncidentPhotoField.jsx`)

- Camera + Gallery side-by-side buttons (52px min height)
- Preview 200px, 4:3 aspect on pick, remove X overlay
- Permission denied → native `Alert.alert`
- No upload progress spinner (upload happens on form submit)

### Gaps

| Gap | Priority |
|-----|----------|
| All three photos use same 200px contain/cover pattern — purpose not visually distinct | P1 |
| No loading state during upload | P1 |
| Civilian photo uses cover; responder photos use contain — inconsistent | P2 |
| Full-screen viewer uses text "×" not icon | P3 |

### Civilian Reference

`AttachmentPicker` uses larger dual upload cards (120px min height), icon wells, thumbnail grid — more inviting for civilians. Responder upload can stay compact but needs **clearer purpose labeling** and upload progress.

---

## 17. Loading/Error/Empty States

### Loading

| Screen | Current | Recommendation |
|--------|---------|----------------|
| Auth gate | Blank colored view | Small centered spinner + "Loading..." |
| Dashboard | `LoadingScreen` full-page | OK for initial sync; avoid on refresh |
| Incident detail | `CaseDetailSkeleton` (card stack) | **Replace with map-first skeleton** |
| Map | `LoadingScreen` | OK |
| Form submit | Button text "Submitting..." | Add inline spinner in button |
| Photo upload | None | Progress bar or spinner overlay on preview |

**Avoid:** Heavy skeleton on every screen. Use skeleton only where layout is complex (detail, dashboard list). Prefer subtle spinners elsewhere.

### Empty States

| State | Current | Assessment |
|-------|---------|------------|
| No assigned incidents | Pulsing orb + "No Active Incidents" | Good — compact, not over-illustrated |
| Map no cases | Sheet empty message | Adequate |
| No assessment | Section hidden | OK |
| No photo | Italic "No ... photo submitted" | OK |

### Error States

| Error type | Current presentation | Issue |
|------------|---------------------|-------|
| Firebase/network | `ErrorAlert` or generic message | OK — no raw Firebase codes observed |
| Accept case (dashboard) | `console.error` only | **P0 — silent failure** |
| Accept case (detail) | `ErrorAlert` in action panel | OK |
| Photo permission | `Alert.alert` | OK |
| Location | Inline banner on map / detail | OK |
| Form validation | Inline disabled submit | OK for assessment; missing for post report |

### Toast Provider Architecture

**Current state:**
- `sonner-native` `Toaster` mounted in **two places**: `App.tsx:46` and `src/app/_layout.jsx:97`
- Toast calls only in `CaseInfoCard.jsx` (scene assessment, post report, blocked post report)
- No custom theme applied to Toaster
- Previous "Toast context is not initialized" issue — **likely mitigated** by dual mount (one may work) but architecture is fragile

**Recommendation:** Single `Toaster` inside `ResqThemeProvider` in `_layout.jsx` only; remove from `App.tsx`. Add toast theme matching dark/light tokens.

---

## 18. Accessibility and Field Usability

Responders use this app outdoors, at night, while moving, under time pressure, one-handed, with poor connectivity.

### Current Strengths

- Many controls have `accessibilityRole` and `accessibilityLabel`
- Touchdown, Accept, Assessment buttons are full-width with adequate height (~48px+)
- High-contrast dark theme available
- Haptic feedback on case accept (`CaseCard`)

### Gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| Dashboard primary action not in thumb zone | P1 | Incident list too far below fold on smaller phones |
| Post Report allows empty submit | P1 | Wasted action under stress |
| Multiple buttons in on-scene panel | P1 | Scene Assessment + Post Report + disabled Post Report + helper text |
| Small metadata text (12–13px) outdoors | P2 | Location/time on cards |
| Pulsing animations (empty state, alerts) | P2 | Respect reduce-motion |
| Form complexity in Scene Assessment | P2 | Many free-text fields vs quick chips |

### Recommendations

- **One primary action** visible without scrolling on detail screen
- **Minimum 15px body text** for outdoor readability
- **48px minimum tap targets** everywhere (already mostly met)
- **High contrast** for status/priority badges (fix purple high priority)
- **Offline-aware copy** when network fails (not just generic error)

---

## 19. Shared Component Opportunities

### Safe to Share (future package or copy)

| Component/Token | Civilian source | Notes |
|-----------------|-----------------|-------|
| Typography scale | Feature constants | Unify into shared `@packages/ui` |
| Spacing/radii | Both compatible | Merge to single export |
| `FormInput` | Nearly identical in both apps | Dedupe |
| `ErrorAlert` | Both apps | Dedupe |
| `LoadingScreen` | Both apps | Dedupe |
| `CustomButton` | Civilian 50px / Responder variant | Single component with variants |
| Photo picker shell | Civilian `AttachmentPicker` layout + Responder upload logic | Hybrid |
| Empty state pattern | Civilian compact icon + copy | Adapt for responder |
| Neutral color tokens | `text`, `textSecondary`, `border`, `surface` | Shared neutrals; keep accent colors separate |
| Bottom nav animation | Civilian Reanimated pill | Apply to Responder tab bar |
| Status badge | `@packages/firebase` `IncidentStatusIndicator` | Already shared ✓ |

### Must Remain Responder-Specific

| Component | Reason |
|-----------|--------|
| `CaseCard` / incident cards | Operational metadata (distance, assignment, accept) |
| `CaseInfoCard` workflow panel | Touchdown, assessment, post report gating |
| `DutyResourceCard` | On-duty / unit picker |
| `PriorityAlertProvider` / `IncidentAlertModal` | Blocking assignment alarm |
| `PostReportModal` presets | EMS-specific (hospitals, cause types) |
| `SceneAssessmentModal` fields | Dynamic per incident type |
| Map FAB + responder tracking | Operational map controls |
| Dashboard stats | Responder metrics |

**Do not merge into one UI.** Share primitives, not layouts.

---

## 20. P0/P1/P2/P3 Issues

### P0 — Operational UX

| ID | Issue | Location |
|----|-------|----------|
| P0-1 | Dashboard doesn't foreground active assignment and next action | `DashboardView.jsx` |
| P0-2 | Accept failure on dashboard card is silent | `CaseCard.jsx:35-37` |
| P0-3 | Detail skeleton layout mismatch causes disorienting load | `CaseDetailSkeleton.jsx` vs `CaseInfoCard.jsx` |
| P0-4 | Notification toggles don't control alert behavior | `NotificationsView.jsx` vs `PriorityAlertProvider` |

### P1 — Major UI/UX

| ID | Issue | Location |
|----|-------|----------|
| P1-1 | Priority color inconsistency (purple high in CaseCard) | `CaseCard.jsx:85-89` |
| P1-2 | Dual Toaster mounts | `App.tsx`, `_layout.jsx` |
| P1-3 | Scene Assessment vs Post Report distinction weak | Modals + read sections |
| P1-4 | Scroll content order doesn't match workflow | `CaseInfoCard.jsx` sections |
| P1-5 | No photo upload progress indicator | `IncidentPhotoField`, submit handlers |
| P1-6 | Post Report allows empty submission | `PostReportModal.jsx` |
| P1-7 | Hardcoded colors bypass theme across cards | `CaseCard.jsx`, parts of `CaseInfoCard` |
| P1-8 | On-scene action panel stacks too many buttons | `CaseInfoCard.jsx` action panel |

### P2 — Visual Refinement

| ID | Issue | Location |
|----|-------|----------|
| P2-1 | Dashboard hero visual density | `DashboardView.jsx` |
| P2-2 | Modal presentation inconsistency | Assessment vs Post Report |
| P2-3 | CaseCard borderRadius 20 vs system 12–16 | `CaseCard.jsx` |
| P2-4 | Dead UI components (~980 lines) | `StickyActionBar`, etc. |
| P2-5 | Font family inconsistencies | `DutyResourceCard`, map error |
| P2-6 | Photo purpose not visually distinct | All photo displays |
| P2-7 | Inline styles on dashboard section header | `DashboardView.jsx` |
| P2-8 | Auth gate blank loading | `AuthIndexGate.jsx` |

### P3 — Nice-to-Have

| ID | Issue |
|----|-------|
| P3-1 | Full-screen photo close uses text × not icon |
| P3-2 | Tab bar could adopt Civilian pill animation |
| P3-3 | Dashboard empty state pulse could respect reduce-motion |
| P3-4 | Profile/settings stub alerts → real screens |

---

## 21. Recommended Responder Design Direction

> **RESQ-LINK Civilian and RESQ-LINK Responder belong to the same product family, but Responder is the operational/professional interface.**

### Responder Should Feel

| Attribute | Expression |
|-----------|------------|
| Professional | Restrained surfaces, no decorative SVG noise on operational screens |
| Fast | Map-first detail, minimal load transitions, single primary CTA |
| Operational | Workflow progress visible; next action always obvious |
| Focused | Dashboard leads with assignment, not stats |
| High-contrast | Dark navy base, readable 15px body, strong badge contrast |
| Modern | Inter typography, 12–16px radius, subtle shadows |
| Calm | Status colors used intentionally — not everything red |
| Reliable | Consistent feedback (toast + inline error) on every action |

### Civilian Can Remain

- Green primary branding
- Approachable hero cards
- Richer onboarding carousel
- Consumer-oriented language

---

## 22. Screen-by-Screen Improvement Plan

### Dashboard (`DashboardView.jsx`)

| | |
|---|---|
| **Current problem** | Hero, identity, stats, and duty card appear before incident list |
| **Why it matters** | Responder can't immediately see assignment or next action |
| **Civilian reference** | Dashboard leads with Report Emergency hero — one focal point |
| **Recommended improvement** | Add "Active Assignment" hero card at top when cases exist (type, priority, location, distance, CTA). Collapse stats to single row or move below. Compress brand hero to compact app bar on subsequent visits. |
| **Priority** | P0 |
| **Components** | `DashboardView`, `CaseCard`, new `ActiveAssignmentHero` |

### Incident Cards (`CaseCard.jsx`)

| | |
|---|---|
| **Current problem** | Hardcoded colors; purple for high priority; accept errors silent; hierarchy doesn't match reference |
| **Why it matters** | Wrong urgency signals; failed accept invisible |
| **Civilian reference** | `PremiumIncidentCard` — stripe, title, metadata row, clear status |
| **Recommended improvement** | Adopt hierarchy: `TYPE · PRIORITY` headline row → location + distance/time → status pill → single CTA. Use `colors.priority*`. Toast on accept error. |
| **Priority** | P0/P1 |
| **Components** | `CaseCard`, `PriorityBadge` |

### Incident Detail (`CaseInfoCard.jsx`)

| | |
|---|---|
| **Current problem** | 1,578-line monolith; scroll order vs workflow; crowded on-scene panel |
| **Why it matters** | Hard to maintain; responder scrolls past irrelevant content |
| **Civilian reference** | Emergency confirmation — status-first, clear action buttons |
| **Recommended improvement** | Extract sections + action panel. Reorder scroll content to workflow. On-scene: show **one** primary CTA (next incomplete step) with secondary as text link. |
| **Priority** | P0/P1 |
| **Components** | `CaseInfoCard`, split into `CaseDetailSheet`, `WorkflowActionPanel` |

### Detail Loading (`CaseDetailSkeleton.jsx`)

| | |
|---|---|
| **Current problem** | Card-stack skeleton; actual UI is map-first |
| **Why it matters** | Jarring transition undermines perceived performance |
| **Recommended improvement** | Map placeholder block + sheet skeleton matching `CaseInfoCard` layout |
| **Priority** | P0 |
| **Components** | `CaseDetailSkeleton` |

### Touchdown (action panel in `CaseInfoCard`)

| | |
|---|---|
| **Current problem** | Good prominence but distance shown with no proximity guidance; `TOUCHDOWN_RADIUS_METERS` unused |
| **Why it matters** | Missed opportunity for operational confidence |
| **Recommended improvement** | Keep manual touchdown. Add subtle proximity hint: "You are X m from pin" near button. Optional: enable button highlight when within radius (no auto-touchdown unless approved). Success: brief haptic + status transition animation on progress step. |
| **Priority** | P2 (proximity hint P1 if dispatch requires it) |
| **Components** | `CaseInfoCard` action panel, progress tracker |

### Scene Assessment (`SceneAssessmentModal.jsx`)

| | |
|---|---|
| **Current problem** | Generic form; pageSheet; indistinguishable from post report entry |
| **Why it matters** | Under time pressure, free-text forms slow responders |
| **Civilian reference** | Emergency form step structure with section headers |
| **Recommended improvement** | Switch to bottom sheet shell. Add section groups + optional preset chips where fields allow. Distinct header: "What We Found" with clipboard icon. Upload progress on submit. |
| **Priority** | P1 |
| **Components** | `SceneAssessmentModal`, shared `OperationalFormSheet` |

### Post Report (`PostReportModal.jsx`)

| | |
|---|---|
| **Current problem** | Allows empty submit; progress doesn't match required fields |
| **Why it matters** | Incomplete reports in operational records |
| **Recommended improvement** | Require reason + people status OR notes. Update progress to reflect required fields. Header: "What We Did". Keep preset chips. |
| **Priority** | P1 |
| **Components** | `PostReportModal` |

### Photos (`IncidentPhotoField.jsx`, detail sections)

| | |
|---|---|
| **Current problem** | Three photo types look identical |
| **Why it matters** | Evidence chain confusion |
| **Recommended improvement** | Purpose badge above each photo ("Civilian Report", "On-Scene Evidence", "Action Evidence"). Consistent aspect ratio. Upload progress overlay. |
| **Priority** | P1 |
| **Components** | `IncidentPhotoField`, `CaseInfoCard`, `SceneAssessmentSection` |

### Navigation (`MainTabBar.jsx`)

| | |
|---|---|
| **Current problem** | Floating pill good but active state less clear than Civilian |
| **Recommended improvement** | Adopt Reanimated active pill from `CustomBottomNav`. Keep 3-tab operational set. |
| **Priority** | P2 |
| **Components** | `MainTabBar` |

### Notifications (`NotificationsView.jsx`)

| | |
|---|---|
| **Current problem** | Toggles don't affect `PriorityAlertProvider` |
| **Recommended improvement** | Wire toggles to alert service or remove until functional |
| **Priority** | P0 |
| **Components** | `NotificationsView`, `PriorityAlertProvider` |

### Toast Architecture

| | |
|---|---|
| **Current problem** | Dual mount; limited usage |
| **Recommended improvement** | Single Toaster in `_layout.jsx`; themed; use for accept, duty, photo, all form submits |
| **Priority** | P1 |
| **Components** | `App.tsx`, `_layout.jsx`, action handlers |

### Settings/Profile (`SettingsView.jsx`)

| | |
|---|---|
| **Current problem** | Stub alerts for profile editing; route/name mismatch |
| **Recommended improvement** | Rename tab label to "Settings" OR route to profile. Implement or hide stub rows. |
| **Priority** | P2 |
| **Components** | `SettingsView`, `(tabs)/_layout.jsx` |

---

## 23. Suggested Implementation Order

### Phase 1 — Design System Consistency

- Unify priority/status colors to theme tokens (remove hardcoded hex in `CaseCard`)
- Establish shared typography/spacing/radii document (both apps)
- Remove duplicate `Toaster`; configure themed toast
- Remove or archive dead components (`StickyActionBar`, `DetailHeader`, `CaseMapSection`)
- Fix font family inconsistencies (remove SpaceGrotesk reference)

### Phase 2 — Dashboard + Navigation

- Active assignment hero when cases exist
- Compress dashboard decorative hero
- Toast on dashboard accept failure
- Wire notification toggles OR hide until functional
- Tab bar active state polish (Reanimated pill)

### Phase 3 — Incident Cards + Incident Detail

- Redesign `CaseCard` hierarchy (type, priority, location, time, status, CTA)
- Map-first `CaseDetailSkeleton`
- Split `CaseInfoCard` into subcomponents (no logic changes)
- Reorder scroll sections to workflow sequence

### Phase 4 — Touchdown + Scene Assessment + Post Report

- Shared bottom sheet form shell
- Scene Assessment: section groups, optional presets
- Post Report: validation gates
- On-scene action panel: single primary CTA pattern
- Touchdown proximity hint

### Phase 5 — Map + Notifications + Secondary Screens

- Map error typography fix
- Notifications wired to alert system
- Settings stub cleanup
- Help-support link from Settings

### Phase 6 — Animations, Loading, Accessibility, Polish

- Reduce-motion support for pulses
- Photo upload progress
- Purpose badges on all photo types
- Auth gate loading spinner
- Final contrast audit for outdoor use

---

## 24. Responder Screen Scores Summary

| Screen | Score | Primary reasons |
|--------|-------|-----------------|
| Login | **7/10** | Polished gradient auth; good error handling |
| Auth gate | **4/10** | Blank loading state |
| Dashboard | **5/10** | Visual noise; assignment not foregrounded |
| Map | **6/10** | Functional; font bug; adequate sheet |
| Incident detail | **6/10** | Good workflow logic; crowded; monolith |
| Scene Assessment | **5/10** | Generic form; inconsistent modal |
| Post Report | **7/10** | Best form UX in app; weak validation |
| Settings | **6/10** | Appearance OK; stubs hurt trust |
| Notifications | **4/10** | Non-functional toggles |
| Support screens | **5/10** | Basic; incomplete linking |
| Tab navigation | **6/10** | Distinctive pill; active state could improve |
| Incident cards | **5/10** | Hierarchy and color issues |
| Empty states | **7/10** | Compact, appropriate |
| Loading states | **5/10** | Detail skeleton mismatch |
| Toast/feedback | **5/10** | Inconsistent; dual mount |

**Overall Responder UI/UX: 5.5/10** — Strong operational bones, inconsistent polish versus Civilian (~8/10).

---

## 25. Proposed Shared Design Tokens (Recommendation Only)

```javascript
// Spacing (8px grid)
spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 }

// Radii
radii: { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 }

// Button heights
button: { sm: 40, md: 48, lg: 52 }

// Input heights
input: { single: 48, multilineMin: 96 }

// Icon sizes
icon: { micro: 12, sm: 16, md: 18, nav: 22, lg: 26 }

// Shared neutrals (dark)
neutral: {
  background: "#0D0F12",      // civilian-aligned
  surface: "#1F242B",
  surfaceElevated: "#101E34", // responder card
  text: "#FFFFFF",
  textSecondary: "#A5ADB8",
  textMuted: "#6B7280",
  border: "rgba(255,255,255,0.08)",
}

// Status (shared)
status: {
  critical: "#DC2626",
  warning: "#F59E0B",
  success: "#16A34A",
  info: "#3B82F6",
  onScene: "#EA580C",
}

// App-specific accents (NOT shared)
accent.civilian: "#34C759"
accent.responder: "#3B82F6"
```

---

## 26. Business Logic Preservation Notice

Any future UI redesign **must preserve**:

- Firebase integration and realtime sync
- Authentication and role gating
- Incident assignment flow
- Accept / Decline behavior
- Location tracking and presence
- Manual Touchdown
- Scene Assessment submission and updates
- Post Report submission
- Photo uploads to correct storage paths
- Push notifications and priority alerts
- Incident status transitions

UI improvements must not alter emergency-response behavior unless separately approved.

---

## Appendix A — Key File References

| Topic | Path |
|-------|------|
| Civilian colors | `apps/civilian-mobile-app/src/theme/colors.js` |
| Civilian bottom nav | `apps/civilian-mobile-app/src/components/CustomBottomNav/index.jsx` |
| Civilian incident card | `apps/civilian-mobile-app/src/features/history/components/PremiumIncidentCard.jsx` |
| Responder tokens | `apps/responder-mobile-app/src/theme/tokens/resqTokens.js` |
| Responder dashboard | `apps/responder-mobile-app/src/modules/dashboard/components/DashboardView.jsx` |
| Incident card | `apps/responder-mobile-app/src/modules/incidents/components/CaseCard.jsx` |
| Incident detail | `apps/responder-mobile-app/src/modules/incidents/components/CaseInfoCard.jsx` |
| Detail skeleton | `apps/responder-mobile-app/src/modules/incidents/components/CaseDetailSkeleton.jsx` |
| Scene assessment | `apps/responder-mobile-app/src/modules/incidents/components/SceneAssessmentModal.jsx` |
| Post report | `apps/responder-mobile-app/src/modules/incidents/components/PostReportModal.jsx` |
| Photo field | `apps/responder-mobile-app/src/modules/incidents/components/IncidentPhotoField.jsx` |
| Tab bar | `apps/responder-mobile-app/src/components/layout/MainTabBar.jsx` |
| Toast mounts | `apps/responder-mobile-app/App.tsx`, `src/app/_layout.jsx` |

---

*End of analysis. No UI code was modified during this review.*
