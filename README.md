# VRChat Proxy Adult Check API

A private API server for checking VRChat adult status.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript project:
```bash
npm run build
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Endpoints

### GET /health
Health check endpoint to verify the API is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /checkAdultStatus
Check adult status for a given username.

**Query Parameters:**
- `username` (required) - The VRChat username to check

**Example Request:**
```
GET /checkAdultStatus?username=example_user
```

**Response:**
```json
{
  "age-verified": "true",
  "username": "example_user"
}
```

The `age-verified` field will be `"true"` if the user is verified as 18+, otherwise `"false"`.

## Environment Variables

- `PORT` - Server port (default: 3010)

