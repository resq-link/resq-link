import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function Bone({ boneStyle, style }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 750 }),
        withTiming(0.3, { duration: 750 })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[boneStyle, style, animatedStyle]} />;
}

function SkeletonCard({ styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <Bone boneStyle={styles.bone} style={styles.circle} />
        <View style={styles.textGroup}>
          <Bone boneStyle={styles.bone} style={styles.lineLong} />
          <Bone boneStyle={styles.bone} style={styles.lineShort} />
        </View>
      </View>

      <Bone boneStyle={styles.bone} style={styles.pill} />
    </View>
  );
}

export default function HistorySkeleton() {
  const { historyTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        paddingTop: 8,
        gap: 12,
      },
      bone: {
        backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
        borderRadius: 6,
      },
      card: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 16,
        backgroundColor: t.card || "#FFFFFF",
        borderWidth: 1,
        borderColor: isLight ? "#EEF2F6" : "rgba(255,255,255,0.08)",
        paddingHorizontal: 16,
        paddingVertical: 14,
      },
      leftCol: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
      },
      circle: {
        width: 36,
        height: 36,
        borderRadius: 18,
      },
      textGroup: {
        flex: 1,
        marginLeft: 12,
        gap: 6,
      },
      lineLong: {
        height: 14,
        width: "70%",
        borderRadius: 4,
      },
      lineShort: {
        height: 10,
        width: "40%",
        borderRadius: 4,
      },
      pill: {
        width: 64,
        height: 26,
        borderRadius: 12,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} styles={styles} />
      ))}
    </View>
  );
}
