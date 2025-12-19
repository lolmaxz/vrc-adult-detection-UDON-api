# vrc-ts Library - User Types and Age Verification

## Overview

The `vrc-ts` library provides TypeScript types for interacting with VRChat's API. For checking adult status, the key types are `User`, `CurrentUser`, and `AgeVerificationStatus`.

## Key User Types

### 1. `User` Type

Returned by `api.userApi.getUserById({ userId })`. This is the full user object that includes age verification information.

**Key Properties:**

- `id: UserIdType` - Unique user identifier
- `displayName: string` - User's display name
- `username?: string` - User's username (optional)
- `ageVerificationStatus: AgeVerificationStatus` - **This is the key field for adult status**
- `bio: string` - User's bio
- `statusDescription: string` - User's status description
- `tags: AllTags[]` - User's tags
- `isFriend: boolean` - Whether the user is a friend

### 2. `CurrentUser` Type

Returned by `api.currentUser` after login. This represents the currently authenticated user.

**Key Properties:**

- `id: UserIdType`
- `displayName: string`
- `ageVerificationStatus: AgeVerificationStatus`
- `ageVerified: boolean` - Boolean indicating if user is age verified
- `isAdult: boolean` - **Boolean indicating if user is an adult**

**Note:** `isAdult` and `ageVerified` are only available on `CurrentUser`, not on the regular `User` type.

### 3. `LimitedUser` / `LimitedUserFriend` Types

Returned by `api.userApi.searchAllUsers()`. These are limited user objects that **do NOT include** age verification information.

**Key Properties:**

- `id: UserIdType`
- `displayName: string`
- `bio?: string`
- `tags: string[]`
- **No `ageVerificationStatus` field** - Limited users don't expose this information

## Age Verification Status Enum

```typescript
enum AgeVerificationStatus {
  Hidden = "hidden", // Age verification status is hidden
  Verified_18_Plus = "18+", // User is verified to be 18 years or older
}
```

## How to Check Adult Status for a Username

### Step 1: Search for the User

Use `searchAllUsers` to find the user by their display name (note: this searches by displayName, not username):

```typescript
const searchResults = await api.userApi.searchAllUsers({
  search: username, // This searches by displayName
  n: 1,
});
```

### Step 2: Get Full User Information

Once you have the user ID from the search results, get the full user object:

```typescript
const user = await api.userApi.getUserById({ userId: searchResults[0].id });
```

### Step 3: Check Age Verification Status

Check the `ageVerificationStatus` field:

```typescript
const isAdult = user.ageVerificationStatus === AgeVerificationStatus.Verified_18_Plus;
```

## Important Notes

1. **Username vs Display Name**: The library's `searchAllUsers` searches by `displayName`, not `username`. VRChat usernames are typically not public, so you'll need to search by display name.

2. **Limited Users Don't Have Age Info**: The `LimitedUser` type returned by `searchAllUsers` does NOT include `ageVerificationStatus`. You must use `getUserById` to get the full `User` object.

3. **Authentication Required**: Both `searchAllUsers` and `getUserById` require authentication (cookies needed).

4. **Age Verification Status Values**:

   - `"18+"` = User is verified to be 18+ (adult)
   - `"hidden"` = Age verification status is hidden (not necessarily non-adult, just not disclosed)

5. **CurrentUser has isAdult**: The `CurrentUser` type (for the logged-in user) has both `ageVerificationStatus` and `isAdult: boolean`, but the regular `User` type only has `ageVerificationStatus`.

## Example Implementation

```typescript
import { VRChatAPI, AgeVerificationStatus } from "vrc-ts";

const api = new VRChatAPI({ userAgent: "YourApp/1.0.0" });
await api.login();

// Search for user by display name
const searchResults = await api.userApi.searchAllUsers({
  search: displayName,
  n: 1,
});

if (searchResults.length === 0) {
  // User not found
  return false;
}

// Get full user info
const user = await api.userApi.getUserById({ userId: searchResults[0].id });

// Check if adult
const isAdult = user.ageVerificationStatus === AgeVerificationStatus.Verified_18_Plus;
```

## API Methods Reference

### UsersApi Methods

- `searchAllUsers({ search, offset, n, fuzzy })`: Returns `LimitedUser[]` or `LimitedUserFriend[]`
  - Searches by displayName
  - Does NOT include age verification info
- `getUserById({ userId })`: Returns `User`
  - Returns full user object
  - **Includes `ageVerificationStatus`**







