require('dotenv').config();
const WebSocket = require('ws');
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { createWalletClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const http_module = require('http');
const { createECDSAMessageSigner: sdkCreateECDSAMessageSigner } = require('@erc7824/nitrolite');
const { createMarketRouter } = require('./api');
const path = require('path');

const CLEARNODE_WS_URL = process.env.CLEARNODE_WS_URL || 'wss://clearnet-sandbox.yellow.com/ws';
const CLOB_PRIVATE_KEY = process.env.CLOB_PRIVATE_KEY || generatePrivateKey();
const SERVER_PORT = process.env.SERVER_PORT || 3001;
const SESSION_DURATION = 3600;
const AUTH_SCOPE = 'xiphias-markets.app';
const APP_NAME = 'Xiphias Markets';

const clobAccount = privateKeyToAccount(CLOB_PRIVATE_KEY);
console.log('==============================================');
console.log('CLOB Server Starting...');
console.log('CLOB Wallet Address:', clobAccount.address);
console.log('==============================================');

let wsConnection = null;
let wsStatus = 'disconnected';
let sessionKey = null;
let isAuthenticated = false;
let sessionExpireTimestamp = '';

function generateSessionKeyPair() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

function generateRequestId() {
  return Math.floor(Math.random() * 2147483647);
}

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function createRPCRequest(method, params = {}) {
  const requestId = generateRequestId();
  const timestamp = getCurrentTimestamp();
  const requestData = [requestId, method, params, timestamp];
  return { req: requestData, sig: [] };
}

function connectToYellow() {
  console.log('Connecting to Yellow Network:', CLEARNODE_WS_URL);
  wsStatus = 'connecting';

  wsConnection = new WebSocket(CLEARNODE_WS_URL);

  wsConnection.on('open', () => {
    console.log('✓ WebSocket Connected to Yellow Network');
    wsStatus = 'connected';
    startAuthentication();
  });

  wsConnection.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  wsConnection.on('close', () => {
    console.log('WebSocket disconnected');
    wsStatus = 'disconnected';
    isAuthenticated = false;
    setTimeout(connectToYellow, 5000);
  });

  wsConnection.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    wsStatus = 'error';
  });
}

function sendMessage(payload) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    wsConnection.send(message);
  } else {
    console.error('WebSocket not connected');
  }
}

async function startAuthentication() {
  sessionKey = generateSessionKeyPair();
  console.log('CLOB Session Key:', sessionKey.address);

  const expireTimestamp = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  sessionExpireTimestamp = String(expireTimestamp);

  const authParams = {
    address: clobAccount.address,
    session_key: sessionKey.address,
    expires_at: expireTimestamp,
    scope: AUTH_SCOPE,
    application: APP_NAME,
    allowances: [{ asset: 'ytest.usd', amount: '1000000' }],
  };

  const authRequest = createRPCRequest('auth_request', authParams);
  console.log('Sending auth request...');
  sendMessage(authRequest);
}

async function handleAuthChallenge(response) {
  const params = response.res ? response.res[2] : response.params;
  const challenge = params?.challengeMessage || params?.challenge_message || params?.challenge;

  if (!challenge) {
    console.error('No challenge in response');
    return;
  }

  console.log('Auth challenge received, signing...');

  const domain = { name: APP_NAME };
  const types = {
    Policy: [
      { name: 'challenge', type: 'string' },
      { name: 'scope', type: 'string' },
      { name: 'wallet', type: 'address' },
      { name: 'session_key', type: 'address' },
      { name: 'expires_at', type: 'uint64' },
      { name: 'allowances', type: 'Allowance[]' },
    ],
    Allowance: [
      { name: 'asset', type: 'string' },
      { name: 'amount', type: 'string' },
    ],
  };

  const message = {
    challenge: challenge,
    scope: AUTH_SCOPE,
    wallet: clobAccount.address,
    session_key: sessionKey.address,
    expires_at: BigInt(sessionExpireTimestamp),
    allowances: [{ asset: 'ytest.usd', amount: '1000000' }],
  };

  try {
    const walletClient = createWalletClient({
      account: clobAccount,
      chain: sepolia,
      transport: http(),
    });

    const signature = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'Policy',
      message,
    });

    console.log('EIP-712 signature created');

    const verifyRequest = createRPCRequest('auth_verify', { challenge: challenge });
    verifyRequest.sig = [signature];
    sendMessage(verifyRequest);
  } catch (error) {
    console.error('Failed to sign auth challenge:', error);
  }
}

// ==================== MESSAGE HANDLER ====================
async function handleMessage(data) {
  const method = data.res ? data.res[1] : data.method;

  if (data.res) {
    const [, responseMethod, params] = data.res;

    switch (responseMethod) {
      case 'auth_challenge':
        await handleAuthChallenge(data);
        break;

      case 'auth_verify':
        if (params?.success) {
          console.log('✓ CLOB Authenticated with Yellow Network');
          isAuthenticated = true;
        } else {
          console.error('Auth verify failed:', params);
        }
        break;

      case 'error':
        console.error('RPC Error:', params);
        break;
    }
  }
}

async function signPayload(payload) {
  if (!sessionKey) {
    throw new Error('CLOB not authenticated');
  }

  const signer = sdkCreateECDSAMessageSigner(sessionKey.privateKey);
  const signature = await signer(payload);
  return signature;
}

async function handleSignRequest(req, res, body) {
  try {
    const { action, message } = JSON.parse(body);

    if (!isAuthenticated) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'CLOB not authenticated' }));
      return;
    }

    let signature;

    switch (action) {
      case 'sign-create-session':
      case 'sign-state-update':
      case 'sign-close-session':
        if (!message || !message.req) {
          throw new Error('Missing message.req payload');
        }
        signature = await signPayload(message.req);
        break;

      case 'get-clob-address':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          address: clobAccount.address,
          sessionKey: sessionKey?.address,
          authenticated: isAuthenticated,
        }));
        return;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ signature }));
  } catch (error) {
    console.error('Sign request error:', error);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// ==================== MARKET ROUTER ====================
const handleMarketRequest = createMarketRouter({
  statePath: path.join(__dirname, 'data', 'market-state.json'),
  clobAddress: clobAccount.address,
});

// ==================== HTTP SERVER ====================
const httpServer = http_module.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: wsStatus,
      authenticated: isAuthenticated,
      clobAddress: clobAccount.address,
      sessionKey: sessionKey?.address,
    }));
    return;
  }

  if (req.method === 'GET' && req.url === '/clob-address') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      address: clobAccount.address,
      sessionKey: sessionKey?.address,
      authenticated: isAuthenticated,
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/sign') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => handleSignRequest(req, res, body));
    return;
  }

  // Market API routes
  if (req.url.startsWith('/api/market')) {
    if (req.method === 'GET') {
      handleMarketRequest(req, res, req.url, null);
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!handleMarketRequest(req, res, req.url, body)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Market route not found' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ==================== START SERVER ====================
httpServer.listen(SERVER_PORT, () => {
  console.log(`CLOB Server listening on port ${SERVER_PORT}`);
  console.log(`Status: http://localhost:${SERVER_PORT}/status`);
  console.log(`CLOB Address: http://localhost:${SERVER_PORT}/clob-address`);
  console.log(`Sign API: POST http://localhost:${SERVER_PORT}/api/sign`);
  console.log(`Market API: http://localhost:${SERVER_PORT}/api/market/*`);
  console.log('');
  connectToYellow();
});

process.on('SIGINT', () => {
  console.log('\nShutting down CLOB server...');
  if (wsConnection) wsConnection.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
