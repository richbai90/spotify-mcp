#!/usr/bin/env node

import express from 'express';
import fetch from 'node-fetch';
import open from 'open';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Configuration
const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const CONFIG_FILE = join(dirname(fileURLToPath(import.meta.url)), '.env.json');

// Load existing configuration if available
let config = {
  clientId: '',
  clientSecret: ''
};

if (existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    console.log('Loaded existing configuration');
  } catch (error) {
    console.error('Error loading config file:', error);
  }
}

// Create Express app
const app = express();

// Generate PKCE challenge
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallengeMethod = 'S256';
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge, codeChallengeMethod };
}

const { codeVerifier, codeChallenge, codeChallengeMethod } = generateCodeChallenge();

// Home page with form to enter client credentials
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Spotify Auth for MCP Server</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
        }
        .container {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        input[type="text"], input[type="password"] {
          width: 100%;
          padding: 8px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        button {
          background-color: #1DB954;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background-color: #1AA34A;
        }
        .instructions {
          margin-bottom: 20px;
        }
        code {
          background-color: #e0e0e0;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <h1>Spotify Auth Token Generator</h1>
      
      <div class="instructions">
        <h2>Instructions</h2>
        <p>This tool helps you generate a Spotify refresh token for the MCP server.</p>
        <ol>
          <li>Create a Spotify app in the <a href="https://developer.spotify.com/dashboard" target="_blank">Spotify Developer Dashboard</a></li>
          <li>Set the redirect URI to: <code>${REDIRECT_URI}</code></li>
          <li>Enter your Client ID and Client Secret below</li>
          <li>Select the permissions needed for the MCP server</li>
          <li>Click "Authorize with Spotify"</li>
        </ol>
      </div>
      
      <div class="container">
        <form action="/authorize" method="GET">
          <label for="clientId">Client ID:</label>
          <input type="text" id="clientId" name="clientId" value="${config.clientId}" required>
          
          <label for="clientSecret">Client Secret:</label>
          <input type="password" id="clientSecret" name="clientSecret" value="${config.clientSecret}" required>
          
          <h3>Permissions</h3>
          <div>
            <input type="checkbox" id="playlist-read" name="scopes" value="playlist-read-private" checked>
            <label for="playlist-read">Read private playlists</label>
          </div>
          <div>
            <input type="checkbox" id="playlist-modify" name="scopes" value="playlist-modify-private" checked>
            <label for="playlist-modify">Modify private playlists</label>
          </div>
          <div>
            <input type="checkbox" id="playlist-modify-public" name="scopes" value="playlist-modify-public" checked>
            <label for="playlist-modify-public">Modify public playlists</label>
          </div>
          <div>
            <input type="checkbox" id="user-read-private" name="scopes" value="user-read-private" checked>
            <label for="user-read-private">Read user profile</label>
          </div>
          <div>
            <input type="checkbox" id="user-read-email" name="scopes" value="user-read-email" checked>
            <label for="user-read-email">Read user email</label>
          </div>
          
          <button type="submit">Authorize with Spotify</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Handle authorization request
app.get('/authorize', (req, res) => {
  const { clientId, clientSecret, scopes } = req.query;
  
  // Save credentials for later
  const scopesArray = Array.isArray(scopes) ? scopes : [scopes];
  
  config.clientId = clientId;
  config.clientSecret = clientSecret;
  
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  // Redirect to Spotify authorization page
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('code_challenge_method', codeChallengeMethod);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('scope', scopesArray.join(' '));
  
  res.redirect(authUrl.toString());
});

// Handle callback from Spotify
app.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.send(`
      <h1>Error</h1>
      <p>Authorization failed: ${error}</p>
      <a href="/">Try again</a>
    `);
  }
  
  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: config.clientId,
        code_verifier: codeVerifier
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      return res.send(`
        <h1>Error</h1>
        <p>Token exchange failed: ${tokens.error}</p>
        <pre>${JSON.stringify(tokens, null, 2)}</pre>
        <a href="/">Try again</a>
      `);
    }
    
    // Display the tokens and instructions
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spotify Auth Complete</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          .token-container {
            background-color: #f5f5f5;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            overflow-wrap: break-word;
          }
          .instructions {
            background-color: #e6f7ff;
            border-left: 4px solid #1890ff;
            padding: 10px 20px;
            margin: 20px 0;
          }
          .env-variables {
            background-color: #f0f0f0;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            margin: 20px 0;
          }
          h2 {
            margin-top: 30px;
          }
          code {
            background-color: #e0e0e0;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <h1>🎉 Authorization Successful!</h1>
        
        <div class="instructions">
          <h3>Next Steps</h3>
          <p>You've successfully authorized your Spotify account. Here's your refresh token that you'll need for the MCP server:</p>
        </div>
        
        <h2>Refresh Token</h2>
        <div class="token-container">
          <code>${tokens.refresh_token}</code>
        </div>
        
        <h2>Environment Variables</h2>
        <p>Set these environment variables when running your MCP server:</p>
        
        <div class="env-variables">
          SPOTIFY_CLIENT_ID="${config.clientId}"<br>
          SPOTIFY_CLIENT_SECRET="${config.clientSecret}"<br>
          SPOTIFY_REFRESH_TOKEN="${tokens.refresh_token}"
        </div>
        
        <div class="instructions">
          <h3>Running the MCP Server</h3>
          <p>To run the Spotify MCP server with these credentials:</p>
          <ol>
            <li>Save the environment variables above</li>
            <li>Run the server with <code>SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... SPOTIFY_REFRESH_TOKEN=... mcp-server-spotify</code></li>
            <li>Or, add them to your environment before running the server</li>
          </ol>
          <p>The token will be automatically refreshed when needed, so you don't need to repeat this process.</p>
        </div>
        
        <p><strong>Important:</strong> Keep your refresh token and client secret secure as they provide access to your Spotify account.</p>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.send(`
      <h1>Error</h1>
      <p>An error occurred: ${error.message}</p>
      <a href="/">Try again</a>
    `);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`);
  console.log(`Please open your browser to http://localhost:${PORT} to begin`);
  
  // Open the browser automatically
  open(`http://localhost:${PORT}`);
});
