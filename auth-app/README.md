# Spotify Auth Token Generator

This is a simple utility app to help you obtain a Spotify refresh token needed for the Spotify MCP server.

## Prerequisites

- Node.js installed
- A Spotify account
- A registered app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## Setup

1. Register a new application in the Spotify Developer Dashboard
2. Set the redirect URI to: `http://localhost:8888/callback`
3. Note your Client ID and Client Secret

## Usage

1. Install dependencies:
   ```
   npm install
   ```

2. Run the app:
   ```
   npm start
   ```

3. Your browser will automatically open to `http://localhost:8888`

4. Enter your Spotify Client ID and Client Secret in the form

5. Select the permissions required (default selections are recommended)

6. Click "Authorize with Spotify" and follow the authorization process

7. Once authorized, you'll be shown your refresh token and instructions for using it with the MCP server

## Environment Variables

After completing the authorization flow, you'll receive three environment variables to use with the MCP server:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`

These should be set when running the MCP server.
