import React, { memo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import SettingsRow from "./SettingsRow";
import { settingsTypography } from "@/features/settings/constants/theme";

function SettingsSection({ title, items, theme, onNavigate, index = 0 }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(340).delay(120 + index * 50)}
      style={styles.wrap}
    >
      <Text
        style={[styles.sectionTitle, { color: theme.textSecondary }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        {items.map((item, itemIndex) => (
          <SettingsRow
            key={item.key}
            icon={item.icon}
            iconColor={item.iconColor}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => onNavigate(item.route)}
            theme={theme}
            isLast={itemIndex === items.length - 1}
          />
        ))}
      </View>
    </Animated.View>
  );
}

export default memo(SettingsSection);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: settingsTypography.sectionTitle,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
});
