import React from "react";
import { View, Text, StyleSheet } from "react-native";

/** Dense metric cell — icon + value + short label. */
export default function DashboardStatCell({
  Icon,
  value,
  label,
  valueColor,
  iconColor,
  iconBg,
  bordered = false,
  theme,
}) {
  const light = theme?.visualScheme === "light";

  return (
    <View
      style={[
        styles.cell,
        bordered && {
          borderRightWidth: 1,
          borderRightColor: light ? "rgba(15, 23, 42, 0.08)" : theme.borderSubtle,
        },
      ]}
    >
      <View style={styles.valueRow}>
        {Icon ? (
          <View style={[styles.iconWell, { backgroundColor: iconBg }]}>
            <Icon size={11} color={iconColor} strokeWidth={2.2} />
          </View>
        ) : null}
        <Text style={[styles.value, { color: valueColor ?? theme.textPrimary }]}>{value}</Text>
      </View>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  iconWell: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
