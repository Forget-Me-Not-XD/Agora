// Pull Node's built in networking module:
const http = require('http');

// Create reference to Node's original createServer function:
const originalCreateServer = http.createServer;

// Monkey Patch the module createServer function with own wrapper:
http.createServer = function patchedCreateServer(...args) {
    const server = originalCreateServer.apply(http, args);
    server.keepAliveTimeout = 100_000;
    server.headersTimeout = 185_000;
    return server;
};

require('./server.js');