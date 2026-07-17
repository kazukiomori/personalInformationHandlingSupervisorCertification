const { withProjectBuildGradle } = require('@expo/config-plugins');

// react-native-google-mobile-ads pulls in play-services-ads, whose Kotlin
// metadata version has consistently run ahead of the Kotlin Gradle Plugin
// version React Native bundles by default (RN 0.81 ships Kotlin 2.1.20,
// which reads metadata up to ~2.1.0; play-services-ads 25.4.0 ships 2.3.0
// metadata). Force a newer Kotlin Gradle Plugin directly on the buildscript
// classpath so it can read it. Verified working via a direct Gradle build
// (RN 0.81's react-native-gradle-plugin, unlike RN 0.76's, tolerates the
// classpath version differing from its own bundled catalog without a
// classloader conflict).
const KOTLIN_VERSION = '2.2.20';

module.exports = function withKotlinVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
      `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}')`
    );

    return config;
  });
};
