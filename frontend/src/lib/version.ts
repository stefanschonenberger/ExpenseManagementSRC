// Static version data - update this when releasing new versions
const versionData = {
  version: "2.1.0",
  build: "20250809.001",
  releaseDate: "2025-08-09",
  codename: "Enhanced UX"
};

export const getVersion = () => {
  return {
    version: versionData.version,
    build: versionData.build,
    releaseDate: versionData.releaseDate,
    codename: versionData.codename,
    fullVersion: `v${versionData.version} (${versionData.build})`
  };
};

export const version = getVersion();