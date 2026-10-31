# Build Buds Firestore Security Specification

## 1. Access Control Model & Roles
- **Bootstrapped Admin**: `johnrufai242@gmail.com` (verified email) or document existence in `/admins/$(request.auth.uid)`.
- **Public / Community Readers**: Community channels (`messages`, `threadReplies`, `presence`, `users`) are readable when querying bounded document structures so visitors and signed-in builders can view live channels and online counts.
- **Authenticated Builders**: Signed-in users (`request.auth != null`) can create their own profile (`/users/{userId}`), private PII record (`/users_private/{userId}`), presence heartbeat (`/presence/{userId}`), post messages (`/messages/{messageId}`), add thread replies (`/messages/{messageId}/threadReplies/{replyId}`), react to messages, and submit moderation reports (`/reports/{reportId}`).

## 2. Collection-by-Collection Security & Validation
- `/admins/{adminId}`: Read-only for signed-in users checking their own admin status; write-restricted to admins.
- `/users/{userId}`:
  - Public profile fields only (`uid`, `displayName`, `schoolName`, `gradeLevel`, `primaryInterest`, `avatarUrl`, `avatarColor`, `role`, `acceptedGuidelines`, `createdAt`, `updatedAt`).
  - Owner can create/update with `role == 'member'` (or `'admin'` if `isAdmin()`). `uid` and `createdAt` are immutable.
- `/users_private/{userId}`:
  - Strictly private (`isOwner(userId)` or `isAdmin()`). Stores `email` and `createdAt`.
- `/presence/{userId}`:
  - Readable when `resource.data.uid is string`.
  - Owner can create/update their own presence & typing indicator with strict string bounds.
- `/messages/{messageId}`:
  - Readable when `resource.data.channelId is string && resource.data.channelId.size() <= 64`.
  - Create requires `request.auth != null`, `request.resource.data.authorId == request.auth.uid`, valid bounded strings (`text` <= 2000 chars, optional `coverImageUrl` <= 350000 chars for compressed canvas data URL, optional link fields), and `createdAt == request.time`.
  - Update allows:
    1. Any signed-in user updating only `reactions` or `threadCount` while all core message fields remain unchanged.
    2. Message author updating `text` (within 2000 chars) while keeping `authorId`, `channelId`, `createdAt` unchanged.
  - Delete allowed for the message `authorId` or `isAdmin()`.
- `/messages/{messageId}/threadReplies/{replyId}`:
  - Readable when `resource.data.messageId is string`.
  - Create requires `request.auth != null`, `request.resource.data.authorId == request.auth.uid`, bounded `text` (1..1500 chars), and `createdAt == request.time`.
  - Delete allowed for reply `authorId` or `isAdmin()`.
- `/reports/{reportId}`:
  - Create requires `request.auth != null`, `request.resource.data.reporterId == request.auth.uid`, `status == 'open'`, and `createdAt == request.time`.
  - Read/Update/Delete restricted to `isAdmin()`.
