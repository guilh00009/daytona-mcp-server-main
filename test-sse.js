// Simple test script to verify SSE endpoint works
const EventSource = require('eventsource');

// Test SSE connection
function testSSE() {
  console.log('Testing SSE endpoint...');
  
  // Test with a dummy sandbox ID
  const testSandboxId = 'test-sandbox-123';
  const sseUrl = `http://localhost:3000/sse?sandboxId=${testSandboxId}&eventType=sandbox-status`;
  
  console.log(`Connecting to: ${sseUrl}`);
  
  const eventSource = new EventSource(sseUrl);
  
  eventSource.onopen = function(event) {
    console.log('✅ SSE connection opened');
  };
  
  eventSource.addEventListener('connected', function(event) {
    console.log('✅ Connected event received:', JSON.parse(event.data));
  });
  
  eventSource.addEventListener('sandbox-status', function(event) {
    console.log('✅ Sandbox status event received:', JSON.parse(event.data));
  });
  
  eventSource.addEventListener('error', function(event) {
    console.log('❌ Error event received:', event);
  });
  
  eventSource.onerror = function(event) {
    console.log('❌ SSE connection error:', event);
  };
  
  // Close after 10 seconds
  setTimeout(() => {
    console.log('Closing SSE connection...');
    eventSource.close();
    process.exit(0);
  }, 10000);
}

// Only run if this file is executed directly
if (require.main === module) {
  testSSE();
}

module.exports = { testSSE };
