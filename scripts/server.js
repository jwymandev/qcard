#!/usr/bin/env node

/**
 * Custom server script for DigitalOcean deployment
 * This ensures the application listens on the correct port
 */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Determine environment
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Get port from environment or use default
const port = process.env.PORT || 8080;

app.prepare().then(() => {
  console.log(`> Starting custom Next.js server on port ${port}`);
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});