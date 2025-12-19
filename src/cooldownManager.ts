/**
 * Cooldown manager to ensure minimum time between requests
 * Prevents sending too many requests to VRChat API
 */
class CooldownManager {
  private lastRequestTime: number = 0;
  private readonly cooldownMs: number = 3000; // 3 seconds in milliseconds

  /**
   * Wait if necessary to ensure cooldown period has elapsed
   * Returns immediately if cooldown has already passed
   */
  public async waitForCooldown(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.cooldownMs) {
      const waitTime = this.cooldownMs - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Update last request time after waiting
    this.lastRequestTime = Date.now();
  }

  /**
   * Get the time remaining until cooldown expires (in milliseconds)
   * Returns 0 if cooldown has already expired
   */
  public getTimeRemaining(): number {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const remaining = this.cooldownMs - timeSinceLastRequest;
    return remaining > 0 ? remaining : 0;
  }
}

// Export singleton instance
export default new CooldownManager();







