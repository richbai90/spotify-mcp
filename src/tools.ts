import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Define Spotify API tools
export const SEARCH_TRACKS_TOOL: Tool = {
  name: "spotify_search_tracks",
  description:
    "Searches for tracks on Spotify based on a query string. " +
    "Use this to find music tracks by name, artist, album, or any combination. " +
    "Results include track titles, artists, albums, and Spotify IDs. " +
    "Useful for discovering music to add to playlists.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for tracks (e.g., 'Dance Monkey', 'Dua Lipa', 'Jazz')"
      },
      limit: {
        type: "number",
        description: "Number of results to return (1-50, default 10)",
        default: 10
      }
    },
    required: ["query"]
  }
};

export const GET_RECOMMENDATIONS_TOOL: Tool = {
  name: "spotify_get_recommendations",
  description:
    "Gets track recommendations from Spotify based on seed tracks, artists, or genres. " +
    "Use this to discover new music similar to tracks or artists the user likes. " +
    "You can specify audio features like tempo, energy, etc. to further refine recommendations.",
  inputSchema: {
    type: "object",
    properties: {
      seed_tracks: {
        type: "array",
        description: "Spotify track IDs to use as seeds (up to 5 total seeds)",
        items: {
          type: "string"
        }
      },
      seed_artists: {
        type: "array",
        description: "Spotify artist IDs to use as seeds (up to 5 total seeds)",
        items: {
          type: "string"
        }
      },
      seed_genres: {
        type: "array",
        description: "Genre names to use as seeds (up to 5 total seeds)",
        items: {
          type: "string"
        }
      },
      limit: {
        type: "number",
        description: "Number of recommendations to return (1-100, default 20)",
        default: 20
      },
      target_energy: {
        type: "number",
        description: "Target energy level (0.0 to 1.0)",
      },
      target_danceability: {
        type: "number",
        description: "Target danceability (0.0 to 1.0)",
      },
      target_tempo: {
        type: "number",
        description: "Target tempo in BPM",
      }
    },
    required: []
  }
};

export const CREATE_PLAYLIST_TOOL: Tool = {
  name: "spotify_create_playlist",
  description:
    "Creates a new playlist in the user's Spotify account. " +
    "Use this to create themed playlists or organize music collections. " +
    "You can specify a name, description, and whether the playlist should be public.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the playlist to create"
      },
      description: {
        type: "string",
        description: "Description of the playlist",
        default: ""
      },
      public: {
        type: "boolean",
        description: "Whether the playlist should be public (true) or private (false)",
        default: false
      }
    },
    required: ["name"]
  }
};

export const ADD_TRACKS_TO_PLAYLIST_TOOL: Tool = {
  name: "spotify_add_tracks_to_playlist",
  description:
    "Adds tracks to an existing playlist. " +
    "Use this after creating a playlist or to update an existing one. " +
    "Requires the playlist ID and an array of track URIs.",
  inputSchema: {
    type: "object",
    properties: {
      playlist_id: {
        type: "string",
        description: "Spotify ID of the playlist to add tracks to"
      },
      track_uris: {
        type: "array",
        description: "Array of Spotify track URIs to add",
        items: {
          type: "string"
        }
      },
      position: {
        type: "number",
        description: "Position to insert tracks (0-based, default is end of playlist)",
      }
    },
    required: ["playlist_id", "track_uris"]
  }
};

export const GET_USER_PLAYLISTS_TOOL: Tool = {
  name: "spotify_get_user_playlists",
  description:
    "Gets a list of the user's playlists. " +
    "Use this to see what playlists the user already has. " +
    "Results include playlist name, description, and ID.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Number of playlists to return (1-50, default 20)",
        default: 20
      },
      offset: {
        type: "number",
        description: "Index of the first playlist to return (for pagination)",
        default: 0
      }
    },
    required: []
  }
};

export const GET_PLAYLIST_TRACKS_TOOL: Tool = {
  name: "spotify_get_playlist_tracks",
  description:
    "Gets the tracks in a specific playlist. " +
    "Use this to see what tracks are in a playlist the user mentions. " +
    "Results include track titles, artists, and other metadata.",
  inputSchema: {
    type: "object",
    properties: {
      playlist_id: {
        type: "string",
        description: "Spotify ID of the playlist to get tracks from"
      },
      limit: {
        type: "number",
        description: "Number of tracks to return (1-100, default 50)",
        default: 50
      },
      offset: {
        type: "number",
        description: "Index of the first track to return (for pagination)",
        default: 0
      }
    },
    required: ["playlist_id"]
  }
};

// Type guards for tool arguments
export function isSearchTracksArgs(args: unknown): args is { query: string; limit?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as { query: string }).query === "string"
  );
}

export function isGetRecommendationsArgs(args: unknown): args is {
  seed_tracks?: string[];
  seed_artists?: string[];
  seed_genres?: string[];
  limit?: number;
  target_energy?: number;
  target_danceability?: number;
  target_tempo?: number;
} {
  const params = args as any;
  return (
    typeof args === "object" &&
    args !== null &&
    (
      ("seed_tracks" in params && Array.isArray(params.seed_tracks)) ||
      ("seed_artists" in params && Array.isArray(params.seed_artists)) ||
      ("seed_genres" in params && Array.isArray(params.seed_genres))
    )
  );
}

export function isCreatePlaylistArgs(args: unknown): args is { name: string; description?: string; public?: boolean } {
  return (
    typeof args === "object" &&
    args !== null &&
    "name" in args &&
    typeof (args as { name: string }).name === "string"
  );
}

export function isAddTracksToPlaylistArgs(args: unknown): args is { playlist_id: string; track_uris: string[]; position?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "playlist_id" in args &&
    typeof (args as { playlist_id: string }).playlist_id === "string" &&
    "track_uris" in args &&
    Array.isArray((args as { track_uris: string[] }).track_uris)
  );
}

export function isGetUserPlaylistsArgs(args: unknown): args is { limit?: number; offset?: number } {
  return (
    typeof args === "object" &&
    args !== null
  );
}

export function isGetPlaylistTracksArgs(args: unknown): args is { playlist_id: string; limit?: number; offset?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "playlist_id" in args &&
    typeof (args as { playlist_id: string }).playlist_id === "string"
  );
}
