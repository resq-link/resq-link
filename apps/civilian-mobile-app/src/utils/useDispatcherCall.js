import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import useUserStore from "./userStore";
import { startIncidentCallSession } from "@packages/firebase";

export function useDispatcherCall() {
  const router = useRouter();
  const { user } = useUserStore();
  const [callLoading, setCallLoading] = useState(false);

  const handleDispatcherCall = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to call the command center.");
      return;
    }

    setCallLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const userId = user.uid || user.id;
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      const session = await startIncidentCallSession({
        incidentId: `civilian_${userId}_${Date.now()}`,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/calling",
        params: {
          sessionId: session.id,
          incidentId: session.incidentId,
          channelName: session.channelName,
        },
      });

      return session;
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Call Failed",
        error?.message || "Unable to notify the command center. Please use SOS or submit a report."
      );
      return null;
    } finally {
      setCallLoading(false);
    }
  };

  return {
    handleDispatcherCall,
    callLoading,
  };
}
