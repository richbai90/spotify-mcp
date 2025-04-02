# MCP Server for Spotify

This MCP server integrates with the Spotify API to allow you to manage and create playlists through Claude.

## Features

- Search for tracks, artists, and albums
- Create and modify playlists
- Browse user playlists
- Get recommendations based on tracks, artists, and genres

## Authentication Setup

1. Create a Spotify App in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
2. Set the redirect URI to `http://localhost:8888/callback`
3. Use the included auth app to get your refresh token:

```sh
# Go to the auth-app directory
cd auth-app

# Install dependencies
npm install

# Run the auth app
npm start
```

4. Follow the instructions in the browser to authorize and obtain your refresh token

5. Set the required environment variables:

```sh
export SPOTIFY_CLIENT_ID="your-client-id"
export SPOTIFY_CLIENT_SECRET="your-client-secret"
export SPOTIFY_REFRESH_TOKEN="your-refresh-token"
```

## Running the Server

Once you have the required environment variables, you can run the server:

```sh
# From the root directory
npm install
npm run build
node dist/index.js
```

## Docker Usage

You can also build and run the server using Docker:

```sh
# Build the Docker image
podman build -t mcp/spotify -f src/spotify/Dockerfile .

# Run the container with environment variables
podman run -e SPOTIFY_CLIENT_ID="your-client-id" \
  -e SPOTIFY_CLIENT_SECRET="your-client-secret" \
  -e SPOTIFY_REFRESH_TOKEN="your-refresh-token" \
  mcp/spotify
```

## Usage with Claude

Add the following to your server configuration

```json

{
  "mcpServers": {
    "spotify": {
      "command": "podman",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "SPOTIFY_CLIENT_ID=your-client-id",
        "-e",
        "SPOTIFY_CLIENT_SECRET=your-client-secret",
        "-e",
        "SPOTIFY_REFRESH_TOKEN=your-refresh-token",
        "mcp/spotify"
      ]
    }
  }
}
```

## Prompting

Once the MCP server is running, Claude can utilize it to:

1. Search for music on Spotify
2. Create playlists based on themes or genres
3. Add tracks to playlists
4. Explore your existing playlists
5. Get recommendations based on your music preferences

Simply ask Claude to create a playlist or find music, and it will utilize the appropriate Spotify API tools through the MCP server.
