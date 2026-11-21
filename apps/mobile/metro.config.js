const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo SDK 58 auto-detects pnpm workspaces and resolves workspace symlinks via
// its on-demand filesystem. Do not add watchFolders, nodeModulesPaths or
// disableHierarchicalLookup: they are obsolete and can break peer resolution.

module.exports = config;
