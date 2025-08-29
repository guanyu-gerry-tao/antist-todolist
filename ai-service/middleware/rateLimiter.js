/**
 * IP-based Rate Limiter Middleware
 * Limits requests to 30 per hour per IP address
 * Local testing IPs have unlimited access
 */

class IPRateLimiter {
  constructor() {
    // Store request counts: { ip: { count: number, resetTime: timestamp } }
    this.requestCounts = new Map();
    
    // Local/testing IP addresses that bypass rate limiting
    this.whitelistedIPs = new Set([
      '127.0.0.1',
      '::1',
      'localhost',
      '::ffff:127.0.0.1'
    ]);
    
    // Rate limit configuration
    this.maxRequests = 30;
    this.windowMs = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  getClientIP(req) {
    // Get real IP address, handling various proxy headers
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           '127.0.0.1';
  }

  isWhitelisted(ip) {
    // Check if IP is in whitelist or is a local development IP
    if (this.whitelistedIPs.has(ip)) {
      return true;
    }
    
    // Check for local network ranges
    if (ip.startsWith('192.168.') || 
        ip.startsWith('10.') || 
        ip.startsWith('172.16.') ||
        ip === '0.0.0.0') {
      return true;
    }
    
    return false;
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(ip);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      const clientIP = this.getClientIP(req);
      
      // Log the request for debugging
      console.log(`Rate limiter check for IP: ${clientIP}`);
      
      // 在开发环境下完全跳过速率限制
      if (process.env.NODE_ENV === 'development') {
        console.log(`Development mode: skipping rate limit for IP ${clientIP}`);
        return next();
      }
      
      // Skip rate limiting for whitelisted IPs
      if (this.isWhitelisted(clientIP)) {
        console.log(`IP ${clientIP} is whitelisted, skipping rate limit`);
        return next();
      }

      const now = Date.now();
      let ipData = this.requestCounts.get(clientIP);

      // Initialize or reset if window expired
      if (!ipData || now > ipData.resetTime) {
        ipData = {
          count: 0,
          resetTime: now + this.windowMs
        };
        this.requestCounts.set(clientIP, ipData);
      }

      // Increment request count
      ipData.count++;

      // Check if limit exceeded
      if (ipData.count > this.maxRequests) {
        const remainingTime = Math.ceil((ipData.resetTime - now) / 1000 / 60); // minutes
        
        console.log(`Rate limit exceeded for IP ${clientIP}. Count: ${ipData.count}/${this.maxRequests}`);
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${this.maxRequests} requests per hour.`,
          retryAfter: remainingTime,
          currentCount: ipData.count,
          maxRequests: this.maxRequests
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests,
        'X-RateLimit-Remaining': Math.max(0, this.maxRequests - ipData.count),
        'X-RateLimit-Reset': new Date(ipData.resetTime).toISOString()
      });

      console.log(`Request allowed for IP ${clientIP}. Count: ${ipData.count}/${this.maxRequests}`);
      next();
    };
  }

  // Method to manually reset rate limit for an IP (useful for testing)
  resetIP(ip) {
    this.requestCounts.delete(ip);
    console.log(`Rate limit reset for IP: ${ip}`);
  }

  // Method to get current stats for an IP
  getStats(ip) {
    const ipData = this.requestCounts.get(ip);
    if (!ipData) {
      return { count: 0, remaining: this.maxRequests };
    }
    
    return {
      count: ipData.count,
      remaining: Math.max(0, this.maxRequests - ipData.count),
      resetTime: new Date(ipData.resetTime).toISOString()
    };
  }

  // Cleanup method for graceful shutdown
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create singleton instance
const rateLimiter = new IPRateLimiter();

// Export both the middleware and the instance for advanced usage
module.exports = {
  rateLimiter: rateLimiter.middleware(),
  rateLimiterInstance: rateLimiter
};
