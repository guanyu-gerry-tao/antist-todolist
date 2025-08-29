/**
 * Rate Limiter Test Script
 * Tests the IP-based rate limiting functionality
 */

const axios = require('axios');

const AI_SERVICE_URL = 'http://localhost:3002';

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiter...\n');
  
  try {
    // Test 1: Check health endpoint (should not be rate limited)
    console.log('1. Testing health endpoint (should not be rate limited):');
    const healthResponse = await axios.get(`${AI_SERVICE_URL}/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}\n`);
    
    // Test 2: Check rate limit stats
    console.log('2. Checking initial rate limit stats:');
    const statsResponse = await axios.get(`${AI_SERVICE_URL}/admin/rate-limit/stats`);
    console.log(`📊 Stats:`, statsResponse.data);
    console.log(`🏠 Is whitelisted: ${statsResponse.data.isWhitelisted}\n`);
    
    // Test 3: Make a few API requests to test rate limiting
    console.log('3. Testing API requests (should be rate limited for non-local IPs):');
    
    for (let i = 1; i <= 3; i++) {
      try {
        const response = await axios.post(`${AI_SERVICE_URL}/api/smart/chat`, {
          message: `Test message ${i}`,
          conversationHistory: []
        });
        
        console.log(`✅ Request ${i}: Success`);
        console.log(`   Rate limit remaining: ${response.headers['x-ratelimit-remaining']}`);
        console.log(`   Rate limit reset: ${response.headers['x-ratelimit-reset']}`);
        
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`❌ Request ${i}: Rate limited`);
          console.log(`   Error: ${error.response.data.message}`);
          console.log(`   Retry after: ${error.response.data.retryAfter} minutes`);
        } else {
          console.log(`❌ Request ${i}: Error - ${error.message}`);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Test 4: Check stats after requests
    console.log('\n4. Checking rate limit stats after requests:');
    const finalStatsResponse = await axios.get(`${AI_SERVICE_URL}/admin/rate-limit/stats`);
    console.log(`📊 Final stats:`, finalStatsResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testRateLimit();
}

module.exports = { testRateLimit };
