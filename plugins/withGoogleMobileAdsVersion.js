const { withProjectBuildGradle } = require('@expo/config-plugins');

// react-native-google-mobile-ads pulls in whatever play-services-ads version
// is hardcoded in its own package.json (currently 25.4.0), which ships
// Kotlin metadata (2.3.0) newer than what Expo 52's default Kotlin Gradle
// Plugin can read, breaking the Android build. The library does NOT support
// overriding this via rootProject.ext (verified against its build.gradle
// source), so force an older, still-current release directly at Gradle's
// dependency-resolution layer instead.
const GOOGLE_MOBILE_ADS_VERSION = '23.6.0';

const FORCE_BLOCK = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'com.google.android.gms:play-services-ads:${GOOGLE_MOBILE_ADS_VERSION}'
        }
    }
}
`;

module.exports = function withGoogleMobileAdsVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    if (config.modResults.contents.includes('play-services-ads')) {
      return config;
    }

    config.modResults.contents += FORCE_BLOCK;
    return config;
  });
};
