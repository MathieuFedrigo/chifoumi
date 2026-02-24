import type { Theme as NavigationTheme } from "@react-navigation/native";

export interface Theme {
  fonts: {
    monospace: {
      regular: string;
      medium: string;
      semiBold: string;
      bold: string;
    };
  };
  colors: {
    // Semantic colors
    exercise: string;
    rest: string;
    warning: string;
    button: string;
    buttonTint: string;
    buttonTintIcon: string;
    // Structural colors
    background: string;
    surface: string;
    surfaceHighlight: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    overlay: string;
    shadow: string;
    badge: string;
    badgeText: string;
    // Phase backgrounds
    exerciseLight: string;
    restLight: string;
    warningLight: string;
  };
  typography: {
    timer: {
      fontSize: number;
      fontWeight: "900";
      letterSpacing: number;
    };
    iterationLarge: {
      fontSize: number;
      fontWeight: "700";
    };
    iterationSmall: {
      fontSize: number;
      fontWeight: "500";
    };
    button: {
      fontSize: number;
      fontWeight: "700";
    };
  };
}

export const lightTheme: Theme = {
  fonts: {
    monospace: {
      regular: "RobotoMono-Regular",
      medium: "RobotoMono-Medium",
      semiBold: "RobotoMono-SemiBold",
      bold: "RobotoMono-Bold",
    },
  },
  colors: {
    // Semantic colors
    exercise: "#10B981",
    rest: "#6B7280",
    warning: "#EF4444",
    button: "#7C3AED",
    buttonTint: "#EDE9FE",
    buttonTintIcon: "#7C3AED",
    // Structural colors
    background: "#FFFFFF",
    surface: "#F9FAFB",
    surfaceHighlight: "#F3F4F6",
    text: "#111827",
    textSecondary: "#6B7280",
    textTertiary: "#6B7280",
    border: "#E5E7EB",
    overlay: "rgba(0, 0, 0, 0.5)",
    shadow: "rgba(0, 0, 0, 0.1)",
    badge: "rgba(255, 255, 255, 0.95)",
    badgeText: "#111827",
    // Phase backgrounds
    exerciseLight: "#D1FAE5",
    restLight: "#F9FAFB",
    warningLight: "#FEF2F2",
  },
  typography: {
    timer: {
      fontSize: 140,
      fontWeight: "900" as const,
      letterSpacing: -4,
    },
    iterationLarge: {
      fontSize: 32,
      fontWeight: "700" as const,
    },
    iterationSmall: {
      fontSize: 18,
      fontWeight: "500" as const,
    },
    button: {
      fontSize: 32,
      fontWeight: "700" as const,
    },
  },
};

export const darkTheme: Theme = {
  fonts: {
    monospace: {
      regular: "RobotoMono-Regular",
      medium: "RobotoMono-Medium",
      semiBold: "RobotoMono-SemiBold",
      bold: "RobotoMono-Bold",
    },
  },
  colors: {
    // Semantic colors (brighter for contrast)
    exercise: "#34D399",
    rest: "#9CA3AF",
    warning: "#F87171",
    button: "#8B5CF6",
    buttonTint: "#4C1D95",
    buttonTintIcon: "#A78BFA",
    // Structural colors (OLED-friendly slate-based)
    background: "#0F172A",
    surface: "#1E293B",
    surfaceHighlight: "#334155",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textTertiary: "#94A3B8",
    border: "#334155",
    overlay: "rgba(0, 0, 0, 0.7)",
    shadow: "rgba(0, 0, 0, 0.3)",
    badge: "rgba(0, 0, 0, 0.8)",
    badgeText: "#F8FAFC",
    // Phase backgrounds
    exerciseLight: "#022C22",
    restLight: "#1E293B",
    warningLight: "#3F1F1F",
  },
  typography: {
    timer: {
      fontSize: 140,
      fontWeight: "900" as const,
      letterSpacing: -4,
    },
    iterationLarge: {
      fontSize: 32,
      fontWeight: "700" as const,
    },
    iterationSmall: {
      fontSize: 18,
      fontWeight: "500" as const,
    },
    button: {
      fontSize: 32,
      fontWeight: "700" as const,
    },
  },
};

// Backward compatibility - default export uses light theme
export const theme = lightTheme;

/* istanbul ignore next - not interesting to test */
export function toNavigationTheme(
  appTheme: Theme,
  isDark: boolean
): NavigationTheme {
  return {
    dark: isDark,
    colors: {
      primary: appTheme.colors.button,        // Purple for interactive elements
      background: appTheme.colors.background, // Screen background
      card: appTheme.colors.surface,          // Tab bar, card backgrounds
      text: appTheme.colors.text,             // Primary text
      border: appTheme.colors.border,         // Borders, dividers
      notification: appTheme.colors.warning,  // Red for alerts
    },
    fonts: {
      regular: {
        fontFamily: appTheme.fonts.monospace.regular,
        fontWeight: "400",
      },
      medium: {
        fontFamily: appTheme.fonts.monospace.medium,
        fontWeight: "500",
      },
      bold: {
        fontFamily: appTheme.fonts.monospace.bold,
        fontWeight: "700",
      },
      heavy: {
        fontFamily: appTheme.fonts.monospace.bold,
        fontWeight: "900",
      },
    },
  };
}
