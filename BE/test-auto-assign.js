// Quick test script to call auto-assignment endpoint
// Run with: node test-auto-assign.js

const http = require('http');

const data = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/demo/auto-assign',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
    
    if (res.statusCode === 200) {
      console.log('\n✅ Auto-assignment successful!');
    } else {
      console.log('\n❌ Auto-assignment failed');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();

console.log('🚀 Calling auto-assignment endpoint...');
