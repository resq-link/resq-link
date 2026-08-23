import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
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
  ArrowLeft,
  CheckCheck,
  MessageSquare,
  Plus,
  Radio,
  Send,
  Users,
  X,
} from "lucide-react-native";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  createDirectChat,
  getMessagingParticipants,
  isThreadUnread,
  markThreadRead,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToChatThreads,
} from "@packages/firebase";
import useUserStore from "@/store/userStore";
import { radii, spacing, useResqTheme } from "@/theme";
import { getBottomNavHeight } from "@/utils/navigationInsets";

function toMillis(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (typeof value === "object" && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value === "object" && typeof value._seconds === "number") {
    return value._seconds * 1000;
  }
  return 0;
}

function formatThreadTime(value) {
  const ms = toMillis(value);
  if (!ms) return "";
  const date = new Date(ms);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(value) {
  const ms = toMillis(value);
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getThreadLabel(thread, currentUserId) {
  if (!thread) return "Dispatch";
  const names =
    thread.participantIds
      ?.filter((id) => id !== currentUserId)
      ?.map((id) => thread.participantNames?.[id])
      ?.filter(Boolean) || [];

  if (thread.type === "group") {
    const title = thread.title?.trim();
    if (title && title.toLowerCase() !== "group chat") return title;
    return names.length > 0 ? names.join(", ") : "Operational Group";
  }

  const otherId = thread.participantIds?.find((id) => id !== currentUserId);
  return otherId
    ? thread.participantNames?.[otherId] || "Command Center"
    : "Command Center";
}

function getThreadSubtitle(thread, currentUserId) {
  if (!thread) return "";
  if (thread.type === "group") return "Group channel";
  const otherId = thread.participantIds?.find((id) => id !== currentUserId);
  const role = otherId ? thread.participantRoles?.[otherId] : null;
  if (role === "command_center") return "Command Center";
  if (role === "dispatcher") return "Dispatcher";
  return "Direct channel";
}

function getInitials(label = "") {
  const parts = String(label).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "D";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getLastPreview(thread) {
  return thread?.lastMessageText?.trim() || "No messages yet";
}

const QUICK_REPLIES = [
  { label: "En route", text: "En route to incident location." },
  { label: "On scene", text: "Arrived on scene." },
  { label: "Need backup", text: "Requesting additional backup." },
  { label: "Need medical", text: "Need ambulance / medical support." },
  { label: "Delayed", text: "Road obstructed — minor delay." },
  { label: "Contained", text: "Situation contained / under control." },
  { label: "Reporting", text: "Preparing post-incident report." },
];

function Avatar({ label, size = 44, colors, accent = false }) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accent ? colors.accentSubtle : colors.surfaceElevated,
          borderColor: accent ? colors.accentBorder : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            fontSize: size >= 44 ? 15 : 12,
            color: accent ? colors.accent : colors.textSecondary,
          },
        ]}
      >
        {getInitials(label)}
      </Text>
    </View>
  );
}

function ThreadRow({ thread, currentUserId, colors, onPress }) {
  const label = getThreadLabel(thread, currentUserId);
  const subtitle = getThreadSubtitle(thread, currentUserId);
  const unread = isThreadUnread(thread, currentUserId);
  const preview = getLastPreview(thread);
  const timeLabel = formatThreadTime(
    thread.lastMessageAt || thread.updatedAt || thread.createdAt
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.threadRow,
        {
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open chat with ${label}`}
    >
      <Avatar label={label} colors={colors} accent={unread} />
      <View style={styles.threadBody}>
        <View style={styles.threadTopRow}>
          <Text
            style={[
              styles.threadTitle,
              {
                color: colors.text,
                fontFamily: unread ? "Inter_700Bold" : "Inter_600SemiBold",
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.threadTime,
              { color: unread ? colors.accent : colors.textMuted },
            ]}
          >
            {timeLabel}
          </Text>
        </View>
        <View style={styles.threadBottomRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[styles.threadRole, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
            <Text
              style={[
                styles.threadPreview,
                {
                  color: unread ? colors.textSecondary : colors.textMuted,
                  fontFamily: unread ? "Inter_500Medium" : "Inter_400Regular",
                },
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          </View>
          {unread ? (
            <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.unreadBadgeText}>New</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function MessageBubble({ message, mine, colors }) {
  return (
    <View
      style={[
        styles.messageRow,
        mine ? styles.messageRowMine : styles.messageRowOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: colors.accent, borderBottomRightRadius: 6 }
            : {
                backgroundColor: colors.bubbleOther,
                borderColor: colors.border,
                borderWidth: StyleSheet.hairlineWidth,
                borderBottomLeftRadius: 6,
              },
        ]}
      >
        {!mine ? (
          <Text style={[styles.senderName, { color: colors.accent }]} numberOfLines={1}>
            {message.senderName || "Command"}
          </Text>
        ) : null}
        <Text style={[styles.messageText, { color: mine ? "#FFFFFF" : colors.text }]}>
          {message.text}
        </Text>
        <View style={styles.messageMeta}>
          <Text
            style={[
              styles.messageTime,
              { color: mine ? "rgba(255,255,255,0.72)" : colors.textMuted },
            ]}
          >
            {formatMessageTime(message.createdAt)}
          </Text>
          {mine ? (
            <CheckCheck size={13} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ResponderMessagesScreen() {
  const { user } = useUserStore();
  const insets = useSafeAreaInsets();
  const { t } = useResqTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isIncidentStack =
    typeof pathname === "string" && pathname.includes("/incident/");

  const [showInbox, setShowInbox] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messageListRef = useRef(null);

  const colors = useMemo(
    () => ({
      bg: t.bg,
      surface: t.surface,
      surfaceElevated: t.surfaceCard,
      surfacePressed: t.surfaceCardHover || t.accentSubtle,
      border: t.border,
      text: t.text,
      textSecondary: t.textSecondary,
      textMuted: t.textMuted,
      accent: t.accent,
      accentSubtle: t.accentSubtle,
      accentBorder: t.accentBorder,
      bubbleOther: t.surfaceCard,
    }),
    [t]
  );

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToChatThreads((items) => {
      setThreads(items);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return undefined;
    }
    return subscribeToChatMessages(selectedThreadId, setMessages);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!isFocused || showInbox || messages.length === 0) return;
    requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd?.({ animated: true });
    });
  }, [isFocused, showInbox, messages]);

  useEffect(() => {
    if (!isFocused || showInbox || !selectedThreadId) return;
    void markThreadRead(selectedThreadId);
  }, [isFocused, showInbox, selectedThreadId, messages.length]);

  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) || null;
  const selectedLabel = getThreadLabel(selectedThread, user?.uid);
  const selectedSubtitle = getThreadSubtitle(selectedThread, user?.uid);
  const unreadCount = threads.filter((thread) =>
    isThreadUnread(thread, user?.uid)
  ).length;

  const sortedThreads = useMemo(() => {
    return [...threads].sort(
      (a, b) =>
        toMillis(b.lastMessageAt || b.updatedAt || b.createdAt) -
        toMillis(a.lastMessageAt || a.updatedAt || a.createdAt)
    );
  }, [threads]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!showInbox && selectedThreadId) {
      setShowInbox(true);
      setShowNewChat(false);
      setError("");
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/dashboard");
  };

  const openThread = (threadId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedThreadId(threadId || null);
    setShowInbox(false);
    setShowNewChat(false);
    setError("");
  };

  const handleCreateDirect = async (participantId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaving(true);
    setError("");
    try {
      const thread = await createDirectChat(participantId);
      setSelectedThreadId(thread.id || null);
      setShowNewChat(false);
      setShowInbox(false);
    } catch (err) {
      setError(err?.message || "Failed to start chat.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = (customText || draft).trim();
    if (!selectedThreadId || !textToSend) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const previousDraft = draft;
    if (!customText) setDraft("");
    setError("");
    try {
      await sendChatMessage(selectedThreadId, textToSend);
    } catch (err) {
      if (!customText) setDraft(previousDraft);
      setError(err?.message || "Failed to send message.");
    }
  };

  if (!user) return null;

  const composerBottomPadding = isIncidentStack
    ? insets.bottom + 12
    : getBottomNavHeight(insets) + 10;

  const showChat = !showInbox && Boolean(selectedThreadId);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          {(isIncidentStack || showChat) && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleBack}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={18} color={colors.text} strokeWidth={2.4} />
            </TouchableOpacity>
          )}

          {showChat ? (
            <View style={styles.chatHeaderIdentity}>
              <Avatar label={selectedLabel} size={36} colors={colors} accent />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[styles.headerTitleChat, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedLabel}
                </Text>
                <Text
                  style={[styles.headerSubtitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {selectedSubtitle}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.inboxHeaderIdentity}>
              <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
                OPERATIONS
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Messages
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                {unreadCount > 0
                  ? `${unreadCount} unread channel${unreadCount === 1 ? "" : "s"}`
                  : "Command & dispatch channels"}
              </Text>
            </View>
          )}
        </View>

        {!showChat ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNewChat((current) => !current);
            }}
            style={[
              styles.iconBtn,
              {
                backgroundColor: showNewChat
                  ? colors.accentSubtle
                  : colors.surfaceElevated,
                borderColor: showNewChat ? colors.accentBorder : colors.border,
              },
            ]}
            accessibilityLabel={showNewChat ? "Close new chat" : "Start new chat"}
          >
            {showNewChat ? (
              <X size={18} color={colors.accent} strokeWidth={2.4} />
            ) : (
              <Plus size={18} color={colors.text} strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {showNewChat && !showChat ? (
        <View
          style={[
            styles.newChatPanel,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.newChatHeader}>
            <Users size={14} color={colors.accent} strokeWidth={2.4} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Start channel with
            </Text>
          </View>
          {participants.length === 0 ? (
            <Text style={[styles.emptyInline, { color: colors.textMuted }]}>
              No dispatchers available right now.
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
                  style={({ pressed }) => [
                    styles.participantCard,
                    {
                      backgroundColor: pressed
                        ? colors.accentSubtle
                        : colors.surfaceElevated,
                      borderColor: colors.border,
                      opacity: isSaving ? 0.6 : 1,
                    },
                  ]}
                >
                  <Avatar
                    label={item.name || "D"}
                    size={34}
                    colors={colors}
                    accent
                  />
                  <Text
                    style={[styles.participantName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.participantRole, { color: colors.accent }]}>
                    {item.role === "command_center" ? "Command" : "Dispatcher"}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      ) : null}

      {!!error && (
        <Text
          style={[
            styles.errorBanner,
            { backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444" },
          ]}
        >
          {error}
        </Text>
      )}

      {!showChat ? (
        <FlatList
          data={sortedThreads}
          keyExtractor={(item) =>
            item.id || `${item.createdByUserId}-${toMillis(item.createdAt)}`
          }
          contentContainerStyle={[
            styles.inboxList,
            sortedThreads.length === 0 && styles.inboxListEmpty,
            { paddingBottom: composerBottomPadding + 8 },
          ]}
          renderItem={({ item }) => (
            <ThreadRow
              thread={item}
              currentUserId={user.uid}
              colors={colors}
              onPress={() => openThread(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconWrap,
                  {
                    backgroundColor: colors.accentSubtle,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <MessageSquare size={26} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No channels yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Start a channel with Command Center or a dispatcher to coordinate
                on scene.
              </Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setShowNewChat(true)}
                style={[styles.emptyCta, { backgroundColor: colors.accent }]}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.emptyCtaText}>New channel</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <>
          <View style={styles.chatBody}>
            <FlatList
              ref={messageListRef}
              data={messages}
              keyExtractor={(item) =>
                item.id || `${item.senderId}-${toMillis(item.createdAt)}`
              }
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.emptyIconWrap,
                      {
                        backgroundColor: colors.accentSubtle,
                        borderColor: colors.accentBorder,
                      },
                    ]}
                  >
                    <Radio size={24} color={colors.accent} strokeWidth={2} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Channel ready
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    Send a status update or tap a quick reply below.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  mine={item.senderId === user.uid}
                  colors={colors}
                />
              )}
            />
          </View>

          <View
            style={[
              styles.quickBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickContent}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_REPLIES.map((reply) => (
                <TouchableOpacity
                  key={reply.label}
                  activeOpacity={0.85}
                  onPress={() => handleSend(reply.text)}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: colors.accentSubtle,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                >
                  <Text style={[styles.quickChipText, { color: colors.accent }]}>
                    {reply.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View
            style={[
              styles.composer,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: composerBottomPadding,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder="Write an operational update…"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => handleSend()}
              disabled={!draft.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: draft.trim() ? colors.accent : colors.textMuted,
                  opacity: draft.trim() ? 1 : 0.4,
                },
              ]}
              accessibilityLabel="Send message"
            >
              <Send size={17} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  inboxHeaderIdentity: { flex: 1, minWidth: 0 },
  chatHeaderIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  headerEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.3,
  },
  headerTitleChat: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.1,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarText: { fontFamily: "Inter_700Bold" },
  newChatPanel: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  newChatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  participantList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  participantCard: {
    width: 118,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    alignItems: "center",
    gap: 6,
  },
  participantName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
  },
  participantRole: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inboxList: { flexGrow: 1 },
  inboxListEmpty: { flexGrow: 1, justifyContent: "center" },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  threadBody: { flex: 1, minWidth: 0 },
  threadTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 2,
  },
  threadTitle: { flex: 1, fontSize: 15 },
  threadTime: { fontFamily: "Inter_500Medium", fontSize: 11 },
  threadBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  threadRole: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginBottom: 1,
  },
  threadPreview: { fontSize: 13, lineHeight: 18 },
  unreadBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  chatBody: { flex: 1 },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  messageRow: { width: "100%", flexDirection: "row" },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  senderName: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  messageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 5,
  },
  messageTime: { fontFamily: "Inter_400Regular", fontSize: 10 },
  quickBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  quickContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  quickChip: {
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 11 : 10,
    paddingBottom: Platform.OS === "ios" ? 11 : 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: spacing.md,
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
    lineHeight: 19,
    textAlign: "center",
  },
  emptyCta: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyCtaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  emptyInline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  errorBanner: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
