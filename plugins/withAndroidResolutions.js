const { withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidResolutions = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Force androidx.core to 1.15.0 across all subprojects to stay compatible with SDK 35
      const resolutionBlock = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core-ktx:1.15.0'
            force 'androidx.core:core:1.15.0'
        }
    }
}
`;
      // Ensure we don't double-append
      if (!config.modResults.contents.includes('androidx.core:core-ktx:1.15.0')) {
        config.modResults.contents = config.modResults.contents + resolutionBlock;
      }
    }
    return config;
  });
};

module.exports = withAndroidResolutions;
