import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle, Plus, Send, X } from "lucide-react-native";
import {
  createDirectChat,
  getMessagingParticipants,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToChatThreads,
} from "@packages/firebase";
import useUserStore from "@/store/userStore";
import { useResqTheme, dashboardThemeDark, dashboardThemeLight } from "@/theme";

function toMillis(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  return 0;
}

function getThreadLabel(thread, currentUserId) {
  if (!thread) return "Select a chat";
  const participantNames = thread.participantIds
    .filter((id) => id !== currentUserId)
    .map((id) => thread.participantNames?.[id])
    .filter(Boolean);

  if (thread.type === "group") {
    const title = thread.title?.trim();
    if (title && title.toLowerCase() !== "group chat") return title;
    return participantNames.length > 0 ? participantNames.join(", ") : "Group chat";
  }

  const otherId = thread.participantIds.find((id) => id !== currentUserId);
  return otherId ? thread.participantNames?.[otherId] || "Direct chat" : "Direct chat";
}

function getThreadSubtitle(thread, currentUserId) {
  if (!thread) return "";
  const participantNames = thread.participantIds
    .filter((id) => id !== currentUserId)
    .map((id) => thread.participantNames?.[id])
    .filter(Boolean);

  if (thread.type === "group") {
    return participantNames.length > 0 ? participantNames.join(", ") : `${thread.participantIds.length} participants`;
  }

  return thread.lastMessageText || "No messages yet";
}

export default function ResponderMessagingWidget() {
  const { user } = useUserStore();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useResqTheme();
  const palette = resolvedScheme === "dark" ? dashboardThemeDark : dashboardThemeLight;
  const styles = useMemo(() => createStyles(palette), [palette]);
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

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) || null;

  const handleCreateDirect = async (participantId) => {
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

  const handleSend = async () => {
    if (!selectedThreadId || !draft.trim()) return;
    const nextDraft = draft;
    setDraft("");
    setError("");
    try {
      await sendChatMessage(selectedThreadId, nextDraft);
    } catch (err) {
      setDraft(nextDraft);
      setError(err?.message || "Failed to send message.");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setIsOpen(true)}
        style={[styles.launcher, { bottom: insets.bottom + 92 }]}
        accessibilityLabel="Open operational messages"
      >
        <MessageCircle size={24} color="#06111f" strokeWidth={2.4} />
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          style={[styles.modalRoot, { paddingTop: insets.top }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Messages</Text>
              <Text style={styles.headerSubtitle}>Dispatcher coordination</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowNewChat((current) => !current)}
                style={styles.iconButton}
                accessibilityLabel="Start dispatcher chat"
              >
                <Plus size={20} color={palette.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsOpen(false)}
                style={styles.iconButton}
                accessibilityLabel="Close messages"
              >
                <X size={20} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {showNewChat && (
            <View style={styles.newChatPanel}>
              <Text style={styles.sectionLabel}>Start chat with dispatcher</Text>
              {participants.length === 0 ? (
                <Text style={styles.emptyText}>No dispatcher-side accounts available.</Text>
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
                      style={styles.participantPill}
                    >
                      <Text style={styles.participantName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.participantRole}>{item.role === "command_center" ? "Command" : "Dispatcher"}</Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          <View style={styles.body}>
            <View style={styles.threadRail}>
              <FlatList
                data={threads}
                keyExtractor={(item) => item.id || `${item.createdByUserId}-${item.createdAt}`}
                ListEmptyComponent={<Text style={styles.emptyText}>No chats yet.</Text>}
                renderItem={({ item }) => {
                  const selected = selectedThreadId === item.id;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={() => setSelectedThreadId(item.id || null)}
                      style={[styles.threadItem, selected && styles.threadItemActive]}
                    >
                      <Text style={[styles.threadTitle, selected && styles.threadTitleActive]} numberOfLines={1}>
                        {getThreadLabel(item, user.uid)}
                      </Text>
                      <Text style={styles.threadPreview} numberOfLines={1}>
                        {getThreadSubtitle(item, user.uid)}
                      </Text>
                      {!!item.lastMessageText && (
                        <Text style={styles.threadLastMessage} numberOfLines={1}>
                          {item.lastMessageText}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            <View style={styles.conversation}>
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationTitle} numberOfLines={1}>
                  {getThreadLabel(selectedThread, user.uid)}
                </Text>
                <Text style={styles.conversationMeta}>
                  {selectedThread ? `${selectedThread.participantIds.length} participant(s)` : "Choose a chat"}
                </Text>
              </View>

              <FlatList
                ref={messageListRef}
                data={messages}
                keyExtractor={(item) => item.id || `${item.senderId}-${toMillis(item.createdAt)}`}
                contentContainerStyle={styles.messageList}
                ListEmptyComponent={
                  <Text style={styles.emptyConversation}>
                    {selectedThread ? "No messages yet." : "Select or start a chat."}
                  </Text>
                }
                renderItem={({ item }) => {
                  const mine = item.senderId === user.uid;
                  return (
                    <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                      <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                        {!mine && <Text style={styles.senderName}>{item.senderName}</Text>}
                        <Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.text}</Text>
                        <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
                          {toMillis(item.createdAt)
                            ? new Date(toMillis(item.createdAt)).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={Boolean(selectedThread)}
              multiline
              placeholder={selectedThread ? "Type a message..." : "Select a chat first"}
              placeholderTextColor={palette.textMuted}
              style={styles.input}
            />
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleSend}
              disabled={!selectedThread || !draft.trim()}
              style={[styles.sendButton, (!selectedThread || !draft.trim()) && styles.sendButtonDisabled]}
              accessibilityLabel="Send message"
            >
              <Send size={19} color="#06111f" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function createStyles(palette) {
  return StyleSheet.create({
    launcher: {
      position: "absolute",
      right: 18,
      width: 58,
      height: 58,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#38bdf8",
      shadowColor: "#000",
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 14,
      zIndex: 1000,
    },
    modalRoot: {
      flex: 1,
      backgroundColor: palette.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: palette.cardBorder,
      backgroundColor: palette.surface,
    },
    headerTitle: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 18,
      color: palette.textPrimary,
    },
    headerSubtitle: {
      marginTop: 2,
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 12,
      color: palette.textSecondary,
    },
    headerActions: {
      flexDirection: "row",
      gap: 8,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
    },
    newChatPanel: {
      borderBottomWidth: 1,
      borderBottomColor: palette.cardBorder,
      padding: 12,
      backgroundColor: palette.card,
    },
    sectionLabel: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 10,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      color: palette.textMuted,
      marginBottom: 8,
    },
    participantList: {
      gap: 8,
      paddingRight: 8,
    },
    participantPill: {
      width: 150,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    participantName: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 12,
      color: palette.textPrimary,
    },
    participantRole: {
      marginTop: 2,
      fontFamily: "SpaceGrotesk_600SemiBold",
      fontSize: 10,
      color: palette.textSecondary,
      textTransform: "uppercase",
    },
    body: {
      flex: 1,
    },
    threadRail: {
      maxHeight: 170,
      borderBottomWidth: 1,
      borderBottomColor: palette.cardBorder,
      padding: 8,
    },
    threadItem: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 6,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.cardBorder,
    },
    threadItemActive: {
      borderColor: "#38bdf8",
      backgroundColor: palette.navActiveBg,
    },
    threadTitle: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 13,
      color: palette.textPrimary,
    },
    threadTitleActive: {
      color: palette.navAccent,
    },
    threadPreview: {
      marginTop: 2,
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 11,
      color: palette.textMuted,
    },
    threadLastMessage: {
      marginTop: 2,
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 10,
      color: palette.textMuted,
      opacity: 0.72,
    },
    conversation: {
      flex: 1,
    },
    conversationHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.cardBorder,
    },
    conversationTitle: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 15,
      color: palette.textPrimary,
    },
    conversationMeta: {
      marginTop: 2,
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 11,
      color: palette.textMuted,
    },
    messageList: {
      padding: 14,
      gap: 10,
    },
    messageRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
    },
    messageRowMine: {
      justifyContent: "flex-end",
    },
    messageBubble: {
      maxWidth: "82%",
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    messageBubbleMine: {
      backgroundColor: "#38bdf8",
    },
    messageBubbleOther: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.cardBorder,
    },
    senderName: {
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 10,
      color: palette.textMuted,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    messageText: {
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 14,
      lineHeight: 20,
      color: palette.textPrimary,
    },
    messageTextMine: {
      color: "#06111f",
    },
    messageTime: {
      marginTop: 4,
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 10,
      color: palette.textMuted,
      textAlign: "right",
    },
    messageTimeMine: {
      color: "rgba(6,17,31,0.72)",
    },
    emptyText: {
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 13,
      color: palette.textMuted,
      textAlign: "center",
      paddingVertical: 12,
    },
    emptyConversation: {
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 14,
      color: palette.textMuted,
      textAlign: "center",
      paddingVertical: 40,
    },
    errorText: {
      borderTopWidth: 1,
      borderTopColor: "rgba(248,113,113,0.25)",
      backgroundColor: "rgba(248,113,113,0.12)",
      color: "#fecaca",
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontFamily: "SpaceGrotesk_600SemiBold",
      fontSize: 12,
    },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: palette.cardBorder,
      backgroundColor: palette.surface,
    },
    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 110,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: palette.textPrimary,
      fontFamily: "SpaceGrotesk_400Regular",
      fontSize: 14,
    },
    sendButton: {
      width: 46,
      height: 46,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#38bdf8",
    },
    sendButtonDisabled: {
      opacity: 0.42,
    },
  });
}
