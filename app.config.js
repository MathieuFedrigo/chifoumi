const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "Chifoumi (Dev)" : "Chifoumi",
    slug: "chifoumi",
    version: "1.0.0",
    orientation: "default",
    scheme: IS_DEV ? "chifoumi-dev" : "chifoumi",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? "com.mldddd.chifoumi.dev" : "com.mldddd.chifoumi",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      icon: {
        light: "./assets/icons/ios-light.png",
        dark: "./assets/icons/ios-dark.png",
        tinted: "./assets/icons/ios-tinted.png",
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"],
          },
        ],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePerformanceData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeOtherDiagnosticData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icons/adaptive-icon.png",
        backgroundColor: "#7C3AED",
        monochromeImage: "./assets/icons/monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: IS_DEV ? "com.mldddd.chifoumi.dev" : "com.mldddd.chifoumi",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/icons/splash-icon-light.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#7C3AED",
          dark: {
            backgroundColor: "#0F172A",
            image: "./assets/icons/splash-icon-dark.png",
          },
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "YOUR_SENTRY_PROJECT",
          organization: "YOUR_SENTRY_ORG",
        },
      ],
      [
        "expo-asset"
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    runtimeVersion: {
      policy: "fingerprint",
    },
    updates: {
      url: "https://u.expo.dev/ffa691dc-e900-4abe-8df4-7c6e23cbb12d",
    },
    extra: {
      router: {},
      eas: {
        projectId: "ffa691dc-e900-4abe-8df4-7c6e23cbb12d",
      },
    },
    owner: "mldddd",
  },
};
