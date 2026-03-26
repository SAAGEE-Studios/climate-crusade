/**
 * LEVELS
 * -------
 * Central registry of all playable levels in the game.
 *
 * Each entry defines a unique level identifier and the path
 * to its configuration file. The configuration file contains
 * metadata such as entry scenes, assets, and optional cutscenes.
 *
 * This structure allows levels to be dynamically loaded and
 * managed without hardcoding scene details throughout the codebase.
 */

export const LEVELS = [
    {
        id: "level01",
        configPath: "./client/Levels/Level01/level.config.json"
    },
    {
        id: "level02",
        configPath: "./client/Levels/Level02/level.config.json"
    },
    {
        id: "level03",
        configPath: "./client/Levels/Level03/level.config.json"
    },
    {
        id: "level04",
        configPath: "./client/Levels/Level04/level.config.json"
    }
];