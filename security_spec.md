# Firestore Security Rules Specification & Red-Team Verification

## 1. Data Invariants
1. **Strict Account Isolation**: Private `/users/{userId}/workspace` and `/users/{userId}/projects` documents are strictly isolated to `request.auth.uid == userId`. Profile reads (`/users/{userId}`), `/login_logs/{logId}`, and `/student_progress/{userId}` are restricted strictly to the owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`).
2. **Consent Gate on Admin Logging**: A `/login_logs/{logId}` entry or `/student_progress/{userId}` creation is invalid unless `consentGiven == true` and `uid == request.auth.uid`. Users who decline or revoke consent cannot be logged into the admin audit log.
3. **Parent Existence (Master Gate)**: Subcollections (`/users/{userId}/workspace/{docId}`, `/users/{userId}/projects/{projectId}`), `/login_logs/{logId}`, and `/student_progress/{userId}` writes require `/users/{request.auth.uid}` to exist with `uid == request.auth.uid`.
4. **Immutable Audit & Ownership Fields**: `uid` / `ownerUid`, `projectId`, `logId`, `createdAt`, and `loggedInAt` can never be altered after creation; `/login_logs/{logId}` documents are immutable (`allow update: if false`).
5. **Zero-Trust Verified Identity & Admin Guard**: Every operation requires `request.auth != null && request.auth.token.email_verified == true`. Admin access requires either an explicit `/admins/{request.auth.uid}` record or verified runtime administrator email (`rfengineer099@gmail.com` with `email_verified == true`).
6. **Strict Key & Size Discipline**: Every write passes `isValidUserProfile`, `isValidWorkspaceState`, `isValidCircuitProject`, `isValidLoginLog`, `isValidStudentProgress`, `isValidLivePair`, or `isValidLivePairPresence` with exact `hasAll`/`hasOnly` allowlists, path-ID regex (`^[a-zA-Z0-9_-]+$` or `^[A-Z0-9]{6}$`), and bounded array/string caps.
7. **2-Student Live Pairing Isolation & Master Gate**: `/live_pairs/{pairId}` rooms enforce `maxParticipants == 2` (`hostUid` + at most one distinct `guestUid`), disallow unauthenticated or non-verified-email access, block student `list` enumeration, and restrict `/presence/{uid}` reads/writes strictly to the two verified room participants.

## 2. Adversarial ("Dirty Dozen") Payloads Rejected (`PERMISSION_DENIED`)
1. Unauthenticated read/write to `/users/userA`, `/login_logs`, or `/student_progress`.
2. Non-admin `userB` attempting `list` or `get` on `/login_logs`, `/student_progress`, or `/users/userA`.
3. Unverified email account (`email_verified == false`) spoofing admin email `rfengineer099@gmail.com` to list `/login_logs` or `/student_progress`.
4. Shadow/Ghost field injection (`isAdmin: true`, `role: "admin"`) on `/users/{userId}` or `/student_progress/{userId}` creation or update.
5. Non-consented login audit write (`consentGiven: false`) to `/login_logs/{logId}` or `/student_progress/{userId}` creation.
6. Identity spoofing (`uid: "userA"` written by `userB` inside `/login_logs/log1` or `/student_progress/userB`).
7. Modifying an existing `/login_logs/{logId}` entry via `update` (audit trail immutability violation).
8. Oversized document ID (`> 128` chars or invalid `/` characters) in `{userId}`, `{projectId}`, or `{logId}`.
9. Oversized `recentOutcomes` (`> 20` items), `department` (`> 120` chars), or negative circuit counts (`correctDesignsCount: -1`).
10. Forged client `createdAt`, `updatedAt`, or `loggedInAt` timestamp != `request.time`.
11. Student attempting to create or modify `/admins/{uid}` to escalate privileges.
12. Accessing undeclared collection `/test/connection` or `/shared/projects` (blocked by global default-deny catch-all).
