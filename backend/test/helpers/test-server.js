// backend/test/helpers/test-server.js
import { createServer } from 'http';
import { app } from '../../src/app.js';

let testServer = null;
let baseUrl = '';

export async function startTestServer() {
  if (testServer) return { server: testServer, baseUrl };

  return new Promise((resolve) => {
    testServer = createServer(app);
    testServer.listen(0, '127.0.0.1', () => {
      const port = testServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve({ server: testServer, baseUrl });
    });
  });
}

export async function stopTestServer() {
  if (!testServer) return;
  return new Promise((resolve) => {
    testServer.close(() => {
      testServer = null;
      baseUrl = '';
      resolve();
    });
  });
}

export async function request(path, options = {}) {
  if (!baseUrl) {
    await startTestServer();
  }

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {}),
  };

  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get('content-type') || '';
  
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    body: data,
  };
}
