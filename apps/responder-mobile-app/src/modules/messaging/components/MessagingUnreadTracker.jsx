import { useEffect } from "react";
import { countUnreadThreads, subscribeToChatThreads } from "@packages/firebase";
import useUserStore from "@/store/userStore";
import { useMessaging } from "@/providers/MessagingProvider";

/** Keeps tab badge unread count in sync without mounting the chat UI globally. */
export default function MessagingUnreadTracker() {
  const { user } = useUserStore();
  const { setUnreadCount } = useMessaging();

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }

    return subscribeToChatThreads((threads) => {
      setUnreadCount(countUnreadThreads(threads, user.uid));
    });
  }, [user, setUnreadCount]);

  return null;
}
