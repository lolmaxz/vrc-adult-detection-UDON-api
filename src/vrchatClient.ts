import { CurrentUser, VRChatAPI } from "vrc-ts";

/**
 * Singleton VRChat API client
 * Ensures we have a single authenticated instance throughout the application
 */
class VRChatClient {
  private static instance: VRChatClient | null = null;
  private api: VRChatAPI | null = null;
  private isAuthenticated: boolean = false;
  private currentUser: CurrentUser | null = null;
  private initializationError: Error | null = null;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of VRChatClient
   */
  public static getInstance(): VRChatClient {
    if (VRChatClient.instance === null) {
      VRChatClient.instance = new VRChatClient();
    }
    return VRChatClient.instance;
  }

  /**
   * Initialize and authenticate the VRChat API client
   * Must be called before the server starts accepting requests
   */
  public async initialize(): Promise<void> {
    if (this.isAuthenticated && this.api !== null) {
      return; // Already initialized
    }

    try {
      // Get configuration from environment variables
      const username = process.env.VRCHAT_USERNAME;
      const password = process.env.VRCHAT_PASSWORD;
      const twoFactorAuthSecret = process.env.VRCHAT_2FA_SECRET;
      const userAgent = process.env.USER_AGENT || "VRChatProxyAdultCheck/1.0.0";
      const useCookies = process.env.USE_COOKIES !== "false"; // Default to true
      const cookiePath = process.env.COOKIES_PATH || "./cookies.json";

      if (!username || !password) {
        throw new Error("VRCHAT_USERNAME and VRCHAT_PASSWORD are required in .env file");
      }

      // Initialize VRChat API client
      this.api = new VRChatAPI({
        username,
        password,
        userAgent,
        TwoFactorAuthSecret: twoFactorAuthSecret,
        useCookies,
        cookiePath,
      });

      // Authenticate
      await this.api.login();

      // Verify authentication
      if (!this.api.currentUser) {
        throw new Error("Authentication failed: currentUser is null");
      }

      this.currentUser = this.api.currentUser;
      this.isAuthenticated = true;
      this.initializationError = null;

      console.log(`VRChat client authenticated as: ${this.currentUser.displayName}`);
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      this.isAuthenticated = false;
      throw this.initializationError;
    }
  }

  /**
   * Get the authenticated VRChat API instance
   * @throws Error if not initialized or authenticated
   */
  public getApi(): VRChatAPI {
    if (!this.api || !this.isAuthenticated) {
      throw new Error("VRChat client is not initialized or authenticated");
    }
    return this.api;
  }

  /**
   * Get the current authenticated user
   */
  public getCurrentUser(): CurrentUser | null {
    return this.currentUser;
  }

  /**
   * Check if the client is authenticated and ready
   */
  public isReady(): boolean {
    return this.isAuthenticated && this.api !== null && this.currentUser !== null;
  }

  /**
   * Get the initialization error if any
   */
  public getInitializationError(): Error | null {
    return this.initializationError;
  }
}

export default VRChatClient.getInstance();







