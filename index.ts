#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import our tool definitions
import {
  SEARCH_TRACKS_TOOL,
  GET_RECOMMENDATIONS_TOOL,
  CREATE_PLAYLIST_TOOL,
  ADD_TRACKS_TO_PLAYLIST_TOOL,
  GET_USER_PLAYLISTS_TOOL,
  GET_PLAYLIST_TRACKS_TOOL,
  isSearchTracksArgs,
  isGetRecommendationsArgs,
  isCreatePlaylistArgs,
  isAddTracksToPlaylistArgs,
  isGetUserPlaylistsArgs,
  isGetPlaylistTracksArgs
} from "./src/tools.js";

// Import our Spotify API methods
import {
  searchTracks,
  getRecommendations,
  createPlaylist,
  addTracksToPlaylist,
  getUserPlaylists,
  getPlaylistTracks
} from "./src/spotify-api.js";

// Check for required environment variables
function validateEnvVar(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Error: ${name} environment variable is required but not set`);
    return false;
  }
  // Check for common issues like quotes or whitespace
  if (value.startsWith('"') || value.endsWith('"') || 
      value.startsWith("'") || value.endsWith("'") ||
      value.startsWith(' ') || value.endsWith(' ')) {
    console.error(`Warning: ${name} contains quotes or extra whitespace which may cause authentication issues`);
    console.error(`Current value (shown with quotes): "${value}"`); 
    console.error(`Try removing quotes/spaces if you're having authentication problems`);
  }
  return true;
}

const envVarsValid = 
  validateEnvVar('SPOTIFY_CLIENT_ID') && 
  validateEnvVar('SPOTIFY_CLIENT_SECRET') && 
  validateEnvVar('SPOTIFY_REFRESH_TOKEN');

if (!envVarsValid) {
  console.error("Error: Required environment variables are missing. Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN");
  process.exit(1);
}

console.error("Environment variables validated. Starting server...");

// Server implementation
const server = new Server(
  {
    name: "example-servers/spotify",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    SEARCH_TRACKS_TOOL,
    GET_RECOMMENDATIONS_TOOL,
    CREATE_PLAYLIST_TOOL,
    ADD_TRACKS_TO_PLAYLIST_TOOL,
    GET_USER_PLAYLISTS_TOOL,
    GET_PLAYLIST_TRACKS_TOOL
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "spotify_search_tracks": {
        if (!isSearchTracksArgs(args)) {
          throw new Error("Invalid arguments for spotify_search_tracks");
        }
        const { query, limit = 10 } = args;
        const results = await searchTracks(query, limit);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "spotify_get_recommendations": {
        if (!isGetRecommendationsArgs(args)) {
          throw new Error("Invalid arguments for spotify_get_recommendations");
        }
        const results = await getRecommendations(args);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "spotify_create_playlist": {
        if (!isCreatePlaylistArgs(args)) {
          throw new Error("Invalid arguments for spotify_create_playlist");
        }
        const { name, description = "", public: isPublic = false } = args;
        const results = await createPlaylist(name, description, isPublic);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "spotify_add_tracks_to_playlist": {
        if (!isAddTracksToPlaylistArgs(args)) {
          throw new Error("Invalid arguments for spotify_add_tracks_to_playlist");
        }
        const { playlist_id, track_uris, position } = args;
        const results = await addTracksToPlaylist(playlist_id, track_uris, position);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "spotify_get_user_playlists": {
        if (!isGetUserPlaylistsArgs(args)) {
          throw new Error("Invalid arguments for spotify_get_user_playlists");
        }
        const { limit = 20, offset = 0 } = args;
        const results = await getUserPlaylists(limit, offset);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      case "spotify_get_playlist_tracks": {
        if (!isGetPlaylistTracksArgs(args)) {
          throw new Error("Invalid arguments for spotify_get_playlist_tracks");
        }
        const { playlist_id, limit = 50, offset = 0 } = args;
        const results = await getPlaylistTracks(playlist_id, limit, offset);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Spotify MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
