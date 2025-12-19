import {
  BadRequestParameter,
  CookiesExpired,
  CookiesNotFound,
  EmailOtpRequired,
  InvalidUserAgent,
  RequestError,
  TOTPRequired,
  UserNotAuthenticated,
} from "vrc-ts";

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  statusCode?: number;
  errorType?: string;
}

/**
 * Check if error is an axios-like error (has statusCode or response.status)
 */
function isAxiosLikeError(error: unknown): error is { statusCode?: number; response?: { status?: number } } {
  return (
    typeof error === "object" &&
    error !== null &&
    ("statusCode" in error ||
      ("response" in error && typeof error.response === "object" && error.response !== null && "status" in error.response))
  );
}

/**
 * Get HTTP status code from various error types
 */
function getStatusCode(error: unknown): number | undefined {
  if (error instanceof RequestError) {
    return error.statusCode;
  }

  if (isAxiosLikeError(error)) {
    return error.statusCode ?? error.response?.status;
  }

  return undefined;
}

/**
 * Handle errors from vrc-ts API calls and convert them to appropriate HTTP responses
 */
export function handleVRChatError(error: unknown): { statusCode: number; response: ErrorResponse } {
  // Handle vrc-ts specific error types
  if (error instanceof RequestError) {
    const statusCode = error.statusCode;
    let httpStatus = 500;

    // Map VRChat API status codes to appropriate HTTP status codes
    if (statusCode === 401) {
      httpStatus = 401;
    } else if (statusCode === 403) {
      httpStatus = 403;
    } else if (statusCode === 404) {
      httpStatus = 404;
    } else if (statusCode === 429) {
      httpStatus = 429; // Too Many Requests
    } else if (statusCode >= 400 && statusCode < 500) {
      httpStatus = statusCode;
    } else if (statusCode >= 500) {
      httpStatus = 502; // Bad Gateway (VRChat API error)
    }

    return {
      statusCode: httpStatus,
      response: {
        error: error.message,
        statusCode: error.statusCode,
        errorType: "RequestError",
      },
    };
  }

  if (error instanceof UserNotAuthenticated) {
    return {
      statusCode: 401,
      response: {
        error: "VRChat client is not authenticated",
        statusCode: 401,
        errorType: "UserNotAuthenticated",
      },
    };
  }

  if (error instanceof BadRequestParameter) {
    return {
      statusCode: 400,
      response: {
        error: error.message || "Invalid request parameter",
        errorType: "BadRequestParameter",
      },
    };
  }

  if (error instanceof InvalidUserAgent) {
    return {
      statusCode: 500,
      response: {
        error: "Invalid user agent configuration",
        errorType: "InvalidUserAgent",
      },
    };
  }

  if (error instanceof TOTPRequired || error instanceof EmailOtpRequired) {
    return {
      statusCode: 500,
      response: {
        error: "2FA authentication required - check configuration",
        errorType: error instanceof TOTPRequired ? "TOTPRequired" : "EmailOtpRequired",
      },
    };
  }

  if (error instanceof CookiesExpired || error instanceof CookiesNotFound) {
    return {
      statusCode: 500,
      response: {
        error: "Cookie authentication issue - may need to re-authenticate",
        errorType: error instanceof CookiesExpired ? "CookiesExpired" : "CookiesNotFound",
      },
    };
  }

  // Handle axios-like errors
  if (isAxiosLikeError(error)) {
    const statusCode = getStatusCode(error);
    if (statusCode) {
      return {
        statusCode: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
        response: {
          error: error instanceof Error ? error.message : "HTTP request failed",
          statusCode,
          errorType: "HttpError",
        },
      };
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    // Check if it's a network error or connection error
    if (error.message.includes("network") || error.message.includes("ECONNREFUSED") || error.message.includes("timeout")) {
      return {
        statusCode: 503,
        response: {
          error: "VRChat API is unavailable",
          errorType: "NetworkError",
        },
      };
    }

    return {
      statusCode: 500,
      response: {
        error: error.message,
        errorType: "Error",
      },
    };
  }

  // Unknown error type
  return {
    statusCode: 500,
    response: {
      error: "An unknown error occurred",
      errorType: "UnknownError",
    },
  };
}







