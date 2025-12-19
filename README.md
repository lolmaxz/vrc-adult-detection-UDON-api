# VRChat Proxy Adult Check API

A private API server that checks VRChat user age verification status (18+) by querying the VRChat API. This service acts as a proxy between VRChat worlds and the VRChat API, allowing world creators to verify if players are age-verified adults.

## What It Does

This API server authenticates with VRChat's official API using your VRChat account credentials, then provides an endpoint that VRChat worlds can call to check if a player is age-verified (18+). The server handles authentication, rate limiting, and error handling, making it easy for world creators to implement age verification checks in their worlds.

## How It Works

1. **Authentication**: The server authenticates with VRChat's API using credentials from environment variables. It uses cookies to maintain the session and avoid repeated logins.

2. **Request Validation**: For security, the API only accepts requests from VRChat Unity clients. It validates:

   - User-Agent header (must match Unity WebRequest from VRChat)
   - Unity version header (`x-unity-version`)
   - A `calledfrom` parameter (query param or header) that identifies which world is making the request

3. **User Lookup**: When a username is provided:

   - Searches VRChat's user database by display name
   - Finds the exact match (case-sensitive)
   - Retrieves full user details including age verification status
   - Returns whether the user is verified as 18+

4. **Rate Limiting**: Implements a 3-second cooldown between requests to prevent hitting VRChat's API rate limits.

5. **Error Handling**: Comprehensive error handling for various VRChat API errors, authentication issues, and network problems.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A VRChat account with API access
- (Optional) 2FA secret if your account has 2FA enabled

### Installation

1. **Clone or download this repository**

2. **Install dependencies:**

```bash
npm install
```

3. **Create a `.env` file** (copy from `.env.example`):

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

4. **Configure your `.env` file** with your VRChat credentials:

```env
VRCHAT_USERNAME=your_vrchat_username
VRCHAT_PASSWORD=your_vrchat_password

# Optional: If you have 2FA enabled, provide your secret key
VRCHAT_2FA_SECRET=your_32_character_2fa_secret

# Optional: Customize port (default: 3010)
PORT=3010

# Optional: Customize user agent
USER_AGENT=Not Hephia Client v1.0.0

# Recommended: Keep cookies enabled for persistent sessions
USE_COOKIES=true
COOKIES_PATH=./cookies.json
```

**Important Notes:**

- The `VRCHAT_2FA_SECRET` is a 32-character string (letters and numbers) that you received when you first enabled 2FA. If you don't have it, you'll need to disable 2FA and re-enable it to get a new secret.
- Cookies are saved to `cookies.json` to avoid re-authenticating on every server restart.

5. **Build the TypeScript project:**

```bash
npm run build
```

6. **Start the server:**

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

7. **Verify it's working:**
   - Check the health endpoint: `http://localhost:3010/health`
   - You should see a response indicating the server is healthy and authenticated

### Deploying to Production

For production use, you'll need to:

1. Deploy the server to a hosting service (e.g., Heroku, AWS, DigitalOcean, etc.)
2. Set environment variables on your hosting platform
3. Ensure the server is accessible via HTTPS (required for VRChat worlds)
4. Update the `ALLOWED_CALLED_FROM` array in `src/index.ts` to include your world identifiers

## API Endpoints

### GET /health

Health check endpoint to verify the API is running and authenticated.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "vrchatClientReady": true,
  "authenticatedUser": "YourDisplayName"
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": "VRChat client not initialized",
  "vrchatClientReady": false
}
```

### GET /checkAdultStatus

Check adult status for a given VRChat display name.

**Query Parameters:**

- `username` (required) - The VRChat display name to check (case-sensitive)
- `calledfrom` (required) - Identifier for the world making the request (must be in allowlist)

**Headers (required for security):**

- `User-Agent`: Must match Unity WebRequest from VRChat
- `x-unity-version`: Unity version (e.g., `2022.3.22f1-DWR`)

**Example Request:**

```
GET /checkAdultStatus?username=ExampleUser&calledfrom=loveworld
```

**Success Response (200 OK):**

```json
{
  "age-verified": "true",
  "username": "ExampleUser"
}
```

**Error Responses:**

- **400 Bad Request** - Missing or invalid username parameter:

```json
{
  "error": "Username query parameter is required and must be a string"
}
```

- **404 Not Found** - User not found:

```json
{
  "error": "User not found"
}
```

- **404 Not Found** - Invalid security headers (appears as "Not found" for security):

```json
{
  "error": "Not found"
}
```

- **429 Too Many Requests** - Rate limited by VRChat API:

```json
{
  "error": "Rate limit exceeded",
  "statusCode": 429,
  "errorType": "RequestError"
}
```

- **500/502/503** - Various server/VRChat API errors:

```json
{
  "error": "Error message",
  "errorType": "ErrorType"
}
```

## Integrating with VRChat Worlds

### Using VRCUrlInputField

This API is designed to be called from VRChat worlds using the `VRCUrlInputField` component and Udon's HTTP request capabilities. Here's how to set it up:

#### 1. Set Up the URL Input Field

1. In Unity, create a GameObject for the URL input
2. Add a `VRCUrlInputField` component to it
3. Configure the input field:
   - Set placeholder text (e.g., "Enter your VRChat display name")
   - Optionally set default text or validation

#### 2. Configure the API URL

The API URL should be constructed as:

```
https://your-api-domain.com/checkAdultStatus?username={DISPLAY_NAME}&calledfrom=yourworldname
```

**Important:**

- Replace `your-api-domain.com` with your actual server domain
- Replace `yourworldname` with an identifier for your world (must match the `ALLOWED_CALLED_FROM` list in the server code)
- The `username` parameter should be the player's VRChat display name

#### 3. User Input Flow

Since VRChat's `VRCUrlInputField` is designed for URLs, users will need to:

1. Enter their VRChat display name in the input field
   - Users can type their display name directly
   - Or copy their display name from another field (e.g., a player info display) and paste it into the URLInput field
2. The world creator should construct the full API URL by:
   - Taking the user's input (display name)
   - URL-encoding it properly
   - Appending it to the base API URL as the `username` query parameter
   - Adding the `calledfrom` parameter

**Example UdonSharp code structure:**

```csharp
// Get the display name from VRCUrlInputField
string displayName = urlInputField.GetUrl().Get();

// Construct the API URL
string apiUrl = $"https://your-api-domain.com/checkAdultStatus?username={Uri.EscapeDataString(displayName)}&calledfrom=yourworldname";

// Make HTTP request using VRChat's HTTP request system
// (Implementation depends on your HTTP request method)
```

#### 4. Making the HTTP Request

Use Udon's HTTP request capabilities to call the API. The request must include:

- Proper headers (VRChat will automatically add Unity headers)
- The `calledfrom` parameter in the query string

#### 5. Handling the Response

Parse the JSON response to extract the age verification status:

```json
{
  "age-verified": "true", // or "false"
  "username": "PlayerDisplayName"
}
```

**Extracting the Data:**

- `age-verified`: String value `"true"` if the player is verified as 18+, `"false"` otherwise
- `username`: The display name that was checked (useful for verification)

#### 6. Storing Results with PlayerData

**Important:** World creators should store the verification result in the player's `PlayerData` with persistence enabled. This prevents repeated API calls for the same player and improves performance.

**Example approach:**

1. When a player is verified, store a flag in their PlayerData:

   - Key: `"ageVerified"` or similar
   - Value: `true` or timestamp
   - Persistence: Enabled

2. Before making an API call, check PlayerData first:

   - If the player already has a verified status stored, use that
   - Only make an API call if the status is not cached

3. Store the result after a successful API call

**Benefits:**

- Reduces API load
- Faster response for returning players
- Better user experience
- Respects rate limits

**Example PlayerData usage:**

```csharp
// Check if already verified
bool isVerified = playerData.GetBool("ageVerified");

if (!isVerified) {
    // Make API call
    // On success, store result:
    playerData.SetBool("ageVerified", true);
    playerData.SetPersistent(true);
}
```

### Security Considerations

1. **HTTPS Required**: The API must be accessible via HTTPS for VRChat worlds to use it
2. **Allowlist**: The server validates requests come from VRChat Unity clients
3. **World Identification**: The `calledfrom` parameter helps identify which worlds are using the API
4. **Rate Limiting**: Built-in cooldown prevents abuse

### VRChat URL Restrictions

Note that VRChat has URL allowlists for security. Your API domain may need to be:

- Added to VRChat's allowlist (if possible)
- Or users must enable "Allow Untrusted URLs" in their VRChat settings

See [VRChat's External URLs documentation](https://creators.vrchat.com/worlds/udon/external-urls/#vrcurl) for more information.

## API Response Format

### Success Response

```json
{
  "age-verified": "true",
  "username": "PlayerDisplayName"
}
```

**Fields:**

- `age-verified` (string): `"true"` if the user is verified as 18+, `"false"` otherwise
- `username` (string): The display name that was checked (matches the input)

**How to Extract:**

- Parse the JSON response
- Check if `age-verified === "true"` to determine if the player is age-verified
- Use `username` to verify you got the correct user

### Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description",
  "errorType": "ErrorTypeName",
  "statusCode": 400
}
```

**Common Error Types:**

- `RequestError`: VRChat API returned an error
- `UserNotAuthenticated`: Server lost authentication with VRChat
- `BadRequestParameter`: Invalid request format
- `NetworkError`: Connection to VRChat API failed
- `UnknownError`: Unexpected error occurred

## Environment Variables

| Variable            | Required | Default                       | Description                                  |
| ------------------- | -------- | ----------------------------- | -------------------------------------------- |
| `VRCHAT_USERNAME`   | Yes      | -                             | Your VRChat username                         |
| `VRCHAT_PASSWORD`   | Yes      | -                             | Your VRChat password                         |
| `VRCHAT_2FA_SECRET` | No       | -                             | 32-character 2FA secret key (if 2FA enabled) |
| `PORT`              | No       | `3010`                        | Server port number                           |
| `USER_AGENT`        | No       | `VRChatProxyAdultCheck/1.0.0` | User agent string for VRChat API             |
| `USE_COOKIES`       | No       | `true`                        | Enable cookie-based session persistence      |
| `COOKIES_PATH`      | No       | `./cookies.json`              | Path to save authentication cookies          |
| `DEBUG`             | No       | `false`                       | Enable debug logging                         |
| `WEBCLIENT_DEBUG`   | No       | `false`                       | Enable web client debug logging              |

## Development

### Project Structure

```
src/
  ├── index.ts           # Main Express server and endpoints
  ├── vrchatClient.ts    # VRChat API client singleton
  ├── cooldownManager.ts # Rate limiting cooldown manager
  └── errorHandler.ts    # Error handling utilities
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Watch Mode

```bash
npm run watch
```

## Troubleshooting

### Authentication Issues

- **"VRChat client not initialized"**: Check your `.env` file has correct credentials
- **"2FA required"**: Add your `VRCHAT_2FA_SECRET` to `.env`
- **"Cookies expired"**: Delete `cookies.json` and restart the server

### API Not Responding

- Check the server logs for errors
- Verify the server is running: `http://localhost:3010/health`
- Check firewall/port settings

### Requests Being Rejected

- Verify your `calledfrom` parameter matches the `ALLOWED_CALLED_FROM` list in `src/index.ts`
- Check that requests are coming from VRChat Unity client (headers must match)
- Ensure you're using HTTPS in production

## License

ISC

## Contributing

This is a private API server. Modify the `ALLOWED_CALLED_FROM` array in `src/index.ts` to add your world identifiers.
