import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Search, X } from "lucide-react-native";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const AnimatedView = Animated.createAnimatedComponent(View);

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search incident type, location, or #ID...",
}) {
  const { historyTheme, isLight } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 46,
        borderRadius: 13,
        borderWidth: 1,
        paddingHorizontal: 13,
        marginTop: 4,
      },
      input: {
        flex: 1,
        fontFamily: "Inter_500Medium",
        fontSize: 13.5,
        color: t.text,
        paddingVertical: 10,
      },
      clearBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
      },
    }),
    historyTheme
  );

  const animatedWrap = useAnimatedStyle(() => ({
    borderColor: focus.value
      ? historyTheme.primary
      : historyTheme.border,
    backgroundColor: focus.value
      ? historyTheme.card
      : isLight
        ? "#FFFFFF"
        : "rgba(23, 26, 31, 0.75)",
    shadowColor: historyTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: focus.value ? (isLight ? 0.12 : 0.22) : 0,
    shadowRadius: 8,
    elevation: focus.value ? 2 : 0,
  }));

  const onFocus = () => {
    setFocused(true);
    focus.value = withTiming(1, { duration: 180 });
  };

  const onBlur = () => {
    setFocused(false);
    focus.value = withTiming(0, { duration: 180 });
  };

  return (
    <AnimatedView style={[styles.wrap, animatedWrap]}>
      <Search
        size={17}
        color={focused ? historyTheme.primary : historyTheme.textSecondary}
        strokeWidth={2.4}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search reports"
      />
      {value?.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <X size={14} color={historyTheme.textSecondary} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </AnimatedView>
  );
}

