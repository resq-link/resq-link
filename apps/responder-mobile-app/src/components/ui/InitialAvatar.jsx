import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useResqTheme } from "@/theme";

const SIZE_MAP = {
  sm: 36,
  md: 44,
};

/**
 * Circular initials avatar.
 * `variant="solid"` matches Civilian dashboard (filled brand circle + light text).
 * `variant="subtle"` keeps a softer bordered treatment for other surfaces.
 */
export default function InitialAvatar({
  initials = "R",
  size = "md",
  variant = "solid",
  style,
  textStyle,
}) {
  const { colors, resolvedScheme } = useResqTheme();
  const isLight = resolvedScheme === "light";
  const dimension = SIZE_MAP[size] ?? SIZE_MAP.md;
  const fontSize = dimension <= 36 ? 13 : 15;

  const palette = useMemo(() => {
    if (variant === "solid") {
      return {
        backgroundColor: colors.accent,
        borderColor: "transparent",
        borderWidth: 0,
        color: "#FFFFFF",
      };
    }
    return {
      backgroundColor: isLight
        ? colors.accentSubtle ?? "rgba(37, 99, 235, 0.10)"
        : "rgba(59, 130, 246, 0.14)",
      borderColor: isLight ? colors.border : colors.borderSolid,
      borderWidth: 1,
      color: isLight ? colors.accent : colors.accentBright ?? colors.accent,
    };
  }, [colors, isLight, variant]);

  return (
    <View
      style={[
        styles.root,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderWidth: palette.borderWidth,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${initials} avatar`}
    >
      <Text
        style={[
          styles.initials,
          { fontSize, color: palette.color },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
