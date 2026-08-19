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
  placeholder = "Search type, location, or ID",
}) {
  const { historyTheme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 48,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        marginTop: 4,
      },
      input: {
        flex: 1,
        fontFamily: "Inter_400Regular",
        fontSize: historyTypography.body,
        color: t.text,
        paddingVertical: 10,
      },
    }),
    historyTheme
  );

  const animatedWrap = useAnimatedStyle(() => ({
    borderColor: focus.value ? historyTheme.primary : historyTheme.border,
    backgroundColor: focus.value ? historyTheme.card : historyTheme.surface,
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
        size={18}
        color={focused ? historyTheme.primary : historyTheme.textSecondary}
        strokeWidth={2.2}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={historyTheme.textSecondary}
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
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <X size={18} color={historyTheme.textSecondary} />
        </Pressable>
      ) : null}
    </AnimatedView>
  );
}
