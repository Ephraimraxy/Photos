// Netlify Functions wrapper for Express server
import express from 'express';
import { registerRoutes } from '../../server/routes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register all routes
const server = await registerRoutes(app);

// Netlify Functions handler
export const handler = async (event, context) => {
  // Convert Netlify event to Express request
  const request = {
    method: event.httpMethod,
    url: event.path,
    headers: event.headers,
    body: event.body,
    query: event.queryStringParameters || {},
    params: event.pathParameters || {}
  };

  // Create response object
  let response = {
    statusCode: 200,
    headers: {},
    body: ''
  };

  // Handle the request
  try {
    // This is a simplified handler - in production, you'd want to use a proper adapter
    // For now, we'll handle the main API routes
    if (request.url.startsWith('/api/')) {
      // Handle API routes
      const apiResponse = await handleApiRequest(request);
      response = apiResponse;
    } else {
      // Serve static files or handle SPA routing
      response.statusCode = 200;
      response.headers['Content-Type'] = 'text/html';
      response.body = 'Photos App - Netlify Functions';
    }
  } catch (error) {
    console.error('Function error:', error);
    response.statusCode = 500;
    response.body = JSON.stringify({ error: 'Internal Server Error' });
  }

  return response;
};

// Simplified API handler for Netlify Functions
async function handleApiRequest(request) {
  const { method, url, body, query } = request;
  
  // Handle different API endpoints
  if (url === '/api/content' && method === 'GET') {
    // Return sample content for now
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          id: 'sample-1',
          title: 'Sample Image',
          type: 'image',
          thumbnailUrl: '/api/content/sample-1/preview'
        }
      ])
    };
  }
  
  if (url.startsWith('/api/content/') && url.endsWith('/preview')) {
    // Handle preview requests
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/jpeg' },
      body: 'Preview image data would go here'
    };
  }
  
  // Default response
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found' })
  };
}
