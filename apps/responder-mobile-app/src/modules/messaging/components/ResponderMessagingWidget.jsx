import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MessageSquare,
  Plus,
  Send,
  X,
  Radio,
  CheckCheck,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  countUnreadThreads,
  createDirectChat,
  getMessagingParticipants,
  isThreadUnread,
  markThreadRead,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToChatThreads,
} from "@packages/firebase";
import useUserStore from "@/store/userStore";
import { useResqTheme } from "@/theme";

function toMillis(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (typeof value === "object" && typeof value._seconds === "number") {
    return value._seconds * 1000;
  }
  return 0;
}

function getThreadLabel(thread, currentUserId) {
  if (!thread) return "Direct Dispatch";
  const participantNames = thread.participantIds
    ?.filter((id) => id !== currentUserId)
    ?.map((id) => thread.participantNames?.[id])
    ?.filter(Boolean) || [];

  if (thread.type === "group") {
    const title = thread.title?.trim();
    if (title && title.toLowerCase() !== "group chat") return title;
    return participantNames.length > 0 ? participantNames.join(", ") : "Operational Group";
  }

  const otherId = thread.participantIds?.find((id) => id !== currentUserId);
  return otherId ? thread.participantNames?.[otherId] || "Dispatcher Chat" : "Dispatcher Chat";
}

const QUICK_FIELD_REPLIES = [
  "🚒 En route to incident location",
  "📍 Arrived on scene",
  "🚨 Requesting additional backup",
  "🏥 Need ambulance / medical support",
  "⚠️ Road obstructed, minor delay",
  "✅ Situation contained / under control",
  "📝 Preparing post-incident report",
];

export default function ResponderMessagingWidget() {
  const { user } = useUserStore();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useResqTheme();
  const isLight = resolvedScheme === "light";

  const [isOpen, setIsOpen] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const messageListRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToChatThreads((items) => {
      setThreads(items);
      setSelectedThreadId((current) => current || items[0]?.id || null);
    });
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    getMessagingParticipants()
      .then((items) => {
        setParticipants(
          items.filter((item) => item.uid !== user.uid && item.role !== "responder")
        );
      })
      .catch((err) => {
        console.error("Failed to load messaging participants:", err);
        setParticipants([]);
      });
  }, [isOpen, user]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return undefined;
    }
    return subscribeToChatMessages(selectedThreadId, setMessages);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!isOpen || messages.length === 0) return;
    requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd?.({ animated: true });
    });
  }, [isOpen, messages]);

  const unreadCount = useMemo(
    () => countUnreadThreads(threads, user?.uid),
    [threads, user?.uid]
  );

  useEffect(() => {
    if (!isOpen || !selectedThreadId) return;
    void markThreadRead(selectedThreadId);
  }, [isOpen, selectedThreadId, messages.length]);

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) || null;

  const handleCreateDirect = async (participantId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaving(true);
    setError("");
    try {
      const thread = await createDirectChat(participantId);
      setSelectedThreadId(thread.id || null);
      setShowNewChat(false);
    } catch (err) {
      setError(err?.message || "Failed to create chat.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = (customText || draft).trim();
    if (!selectedThreadId || !textToSend) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextDraft = draft;
    if (!customText) setDraft("");
    setError("");
    try {
      await sendChatMessage(selectedThreadId, textToSend);
    } catch (err) {
      if (!customText) setDraft(nextDraft);
      setError(err?.message || "Failed to send message.");
    }
  };

  if (!user) {
    return null;
  }

  const themeColors = {
    bg: isLight ? "#F8FAFC" : "#030712",
    surface: isLight ? "#FFFFFF" : "#0B1528",
    card: isLight ? "#FFFFFF" : "#111E36",
    cardBorder: isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.09)",
    textPrimary: isLight ? "#0F172A" : "#F8FAFC",
    textSecondary: isLight ? "#475569" : "#94A3B8",
    textMuted: isLight ? "#94A3B8" : "#64748B",
    accent: "#2563EB",
    accentGlow: "#3B82F6",
    bubbleMine: "#2563EB",
    bubbleOther: isLight ? "#F1F5F9" : "#132340",
    inputBg: isLight ? "#F1F5F9" : "#0B1528",
  };

  return (
    <>
      {/* Floating Operational Chat Trigger */}
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setIsOpen(true);
        }}
        style={[
          styles.launcher,
          {
            bottom: insets.bottom + 90,
            backgroundColor: "#2563EB",
            shadowColor: "#2563EB",
          },
        ]}
        accessibilityLabel={
          unreadCount > 0
            ? `Open Operational Chat, ${unreadCount} unread`
            : "Open Operational Chat"
        }
      >
        <MessageSquare size={24} color="#FFFFFF" strokeWidth={2.4} />
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 9 ? "9+" : String(unreadCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Full Modal Chat Screen */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalRoot, { backgroundColor: themeColors.bg, paddingTop: insets.top }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: themeColors.surface,
                borderBottomColor: themeColors.cardBorder,
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveTag}>LIVE CHANNEL</Text>
              </View>
              <Text
                style={[styles.headerTitle, { color: themeColors.textPrimary }]}
                numberOfLines={1}
              >
                {getThreadLabel(selectedThread, user.uid)}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowNewChat((current) => !current);
                }}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: showNewChat
                      ? "rgba(59, 130, 246, 0.2)"
                      : themeColors.card,
                    borderColor: showNewChat ? "#3B82F6" : themeColors.cardBorder,
                  },
                ]}
                accessibilityLabel="Start chat"
              >
                <Plus size={18} color={themeColors.textPrimary} strokeWidth={2.4} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsOpen(false)}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
                accessibilityLabel="Close messages"
              >
                <X size={18} color={themeColors.textPrimary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Chat Participant Picker */}
          {showNewChat && (
            <View
              style={[
                styles.newChatPanel,
                {
                  backgroundColor: themeColors.card,
                  borderBottomColor: themeColors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
                Dispatchers & Command Staff
              </Text>
              {participants.length === 0 ? (
                <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                  No other dispatchers online.
                </Text>
              ) : (
                <FlatList
                  horizontal
                  data={participants}
                  keyExtractor={(item) => item.uid}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.participantList}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleCreateDirect(item.uid)}
                      disabled={isSaving}
                      style={[
                        styles.participantPill,
                        {
                          backgroundColor: themeColors.surface,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                    >
                      <View style={styles.participantAvatar}>
                        <Text style={styles.participantAvatarText}>
                          {(item.name || "D").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.participantName,
                            { color: themeColors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.participantRole}>
                          {item.role === "command_center" ? "Command" : "Dispatcher"}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          {/* Horizontal Thread Bar */}
          {threads.length > 0 && (
            <View
              style={[
                styles.threadBar,
                {
                  backgroundColor: themeColors.surface,
                  borderBottomColor: themeColors.cardBorder,
                },
              ]}
            >
              <FlatList
                horizontal
                data={threads}
                keyExtractor={(item) => item.id || `${item.createdByUserId}-${item.createdAt}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.threadBarContent}
                renderItem={({ item }) => {
                  const selected = selectedThreadId === item.id;
                  const unread = isThreadUnread(item, user.uid);
                  const label = getThreadLabel(item, user.uid);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedThreadId(item.id || null);
                      }}
                      style={[
                        styles.threadChip,
                        {
                          backgroundColor: selected
                            ? isLight
                              ? "rgba(37, 99, 235, 0.12)"
                              : "rgba(59, 130, 246, 0.18)"
                            : themeColors.card,
                          borderColor: selected
                            ? "#3B82F6"
                            : themeColors.cardBorder,
                        },
                      ]}
                    >
                      {unread && <View style={styles.threadUnreadDot} />}
                      <Text
                        style={[
                          styles.threadChipText,
                          {
                            color: selected
                              ? "#3B82F6"
                              : themeColors.textPrimary,
                            fontWeight: selected || unread ? "700" : "500",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Chat Messages Body */}
          <View style={styles.body}>
            <FlatList
              ref={messageListRef}
              data={messages}
              keyExtractor={(item) => item.id || `${item.senderId}-${toMillis(item.createdAt)}`}
              contentContainerStyle={styles.messageList}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View
                    style={[
                      styles.emptyDisc,
                      { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
                    ]}
                  >
                    <Radio size={28} color="#3B82F6" strokeWidth={2} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                    {selectedThread ? "Encrypted Dispatch Line" : "No Active Chat"}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
                    {selectedThread
                      ? "Direct communications with Command Center & Dispatched Units."
                      : "Select or start a chat from the options above."}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const mine = item.senderId === user.uid;
                const timeMs = toMillis(item.createdAt);
                const timeLabel = timeMs
                  ? new Date(timeMs).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <View
                    style={[
                      styles.messageRow,
                      mine ? styles.messageRowMine : styles.messageRowOther,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        mine
                          ? [styles.messageBubbleMine, { backgroundColor: themeColors.bubbleMine }]
                          : [
                              styles.messageBubbleOther,
                              {
                                backgroundColor: themeColors.bubbleOther,
                                borderColor: themeColors.cardBorder,
                              },
                            ],
                      ]}
                    >
                      {!mine && (
                        <View style={styles.senderHeader}>
                          <Shield size={11} color="#3B82F6" strokeWidth={2.4} />
                          <Text style={styles.senderName}>
                            {item.senderName || "Dispatcher"}
                          </Text>
                        </View>
                      )}

                      <Text
                        style={[
                          styles.messageText,
                          { color: mine ? "#FFFFFF" : themeColors.textPrimary },
                        ]}
                      >
                        {item.text}
                      </Text>

                      <View style={styles.messageMetaRow}>
                        <Text
                          style={[
                            styles.messageTime,
                            { color: mine ? "rgba(255, 255, 255, 0.75)" : themeColors.textMuted },
                          ]}
                        >
                          {timeLabel}
                        </Text>
                        {mine && (
                          <CheckCheck size={13} color="rgba(255, 255, 255, 0.85)" strokeWidth={2.2} />
                        )}
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          </View>

          {/* Quick-Reply Shortcuts Bar */}
          {Boolean(selectedThread) && (
            <View
              style={[
                styles.quickReplyContainer,
                {
                  backgroundColor: themeColors.surface,
                  borderTopColor: themeColors.cardBorder,
                },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickReplyContent}
              >
                {QUICK_FIELD_REPLIES.map((replyText, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => handleSend(replyText)}
                    style={[
                      styles.quickReplyChip,
                      {
                        backgroundColor: isLight
                          ? "rgba(59, 130, 246, 0.08)"
                          : "rgba(59, 130, 246, 0.12)",
                        borderColor: isLight
                          ? "rgba(59, 130, 246, 0.22)"
                          : "rgba(59, 130, 246, 0.28)",
                      },
                    ]}
                  >
                    <Text style={styles.quickReplyText}>{replyText}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* Composer */}
          <View
            style={[
              styles.composer,
              {
                backgroundColor: themeColors.surface,
                borderTopColor: themeColors.cardBorder,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={Boolean(selectedThread)}
              multiline
              placeholder={selectedThread ? "Type operational update..." : "Select a channel above"}
              placeholderTextColor={themeColors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.inputBg,
                  borderColor: themeColors.cardBorder,
                  color: themeColors.textPrimary,
                },
              ]}
            />
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => handleSend()}
              disabled={!selectedThread || !draft.trim()}
              style={[
                styles.sendButton,
                {
                  backgroundColor: !selectedThread || !draft.trim() ? "#64748B" : "#2563EB",
                  opacity: !selectedThread || !draft.trim() ? 0.45 : 1,
                },
              ]}
              accessibilityLabel="Send message"
            >
              <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  launcher: {
    position: "absolute",
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 1000,
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  modalRoot: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  liveTag: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#22C55E",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  newChatPanel: {
    borderBottomWidth: 1,
    padding: 12,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  participantList: {
    gap: 8,
    paddingRight: 8,
  },
  participantPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 170,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  participantAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#3B82F6",
  },
  participantName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  participantRole: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#3B82F6",
    textTransform: "uppercase",
  },
  threadBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  threadBarContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  threadChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  threadUnreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#DC2626",
  },
  threadChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12.5,
  },
  body: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    width: "100%",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleMine: {
    borderTopRightRadius: 4,
  },
  messageBubbleOther: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  senderName: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#3B82F6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  messageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  messageTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 10.5,
  },
  quickReplyContainer: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  quickReplyContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReplyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickReplyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#3B82F6",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyDisc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingVertical: 8,
  },
  errorText: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    color: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
  },
});
