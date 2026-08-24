import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  MessageSquare,
  Send,
  X,
  Shield,
  Radio,
  User,
} from "lucide-react-native";
import {
  subscribeToIncidentChat,
  sendIncidentChatMessage,
} from "@packages/firebase";

export default function CivilianIncidentChatModal({
  visible,
  onClose,
  incident,
  user,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);

  const incidentId = incident?.id || "";

  useEffect(() => {
    if (!visible || !incidentId) return;

    const unsubscribe = subscribeToIncidentChat(incidentId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [visible, incidentId]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !incidentId || isSending) return;

    setIsSending(true);
    try {
      await sendIncidentChatMessage(incidentId, {
        senderId: user?.uid,
        senderName: user?.displayName || user?.fullName || "Citizen",
        senderRole: "civilian",
        text,
      });
      setInputText("");
    } catch (error) {
      console.error("[CivilianIncidentChatModal] Send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (!visible) return null;

  const refNumber = incident?.id ? `APP-${incident.id.slice(-5).toUpperCase()}` : "INCIDENT";

  const renderMessageItem = ({ item }) => {
    const isMe = item.senderRole === "civilian" || item.senderId === user?.uid;
    const isDispatcher = item.senderRole === "dispatcher" || item.senderRole === "command_center";
    const isResponder = item.senderRole === "responder";

    const senderRoleLabel = isDispatcher
      ? "Dispatch Command"
      : isResponder
      ? "Response Unit"
      : "You (Citizen)";

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        <Text
          style={[
            styles.senderLabel,
            isDispatcher
              ? styles.senderLabelDispatch
              : isResponder
              ? styles.senderLabelResponder
              : styles.senderLabelMe,
          ]}
        >
          {senderRoleLabel}
        </Text>
        <View
          style={[
            styles.msgBubble,
            isMe
              ? styles.msgBubbleMe
              : isResponder
              ? styles.msgBubbleResponder
              : styles.msgBubbleOther,
          ]}
        >
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconWrap}>
                <MessageSquare size={18} color="#38BDF8" />
              </View>
              <View>
                <View style={styles.titleBadgeRow}>
                  <Text style={styles.headerTitle}>Live Emergency Chat</Text>
                  <View style={styles.refBadge}>
                    <Text style={styles.refText}>{refNumber}</Text>
                  </View>
                </View>
                <Text style={styles.headerSub}>Direct link to Dispatcher & Responders</Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close chat">
              <X size={20} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Messages Stream */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || String(Math.random())}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MessageSquare size={36} color="#334155" />
                <Text style={styles.emptyTitle}>Live Emergency Messaging</Text>
                <Text style={styles.emptySub}>
                  Send real-time updates, landmarks, or medical notes to the dispatcher.
                </Text>
              </View>
            }
          />

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type message to dispatcher..."
              placeholderTextColor="#64748B"
              style={styles.input}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              accessibilityLabel="Send message"
            >
              <Send size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#1E293B",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  refBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(56, 189, 248, 0.2)",
  },
  refText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#38BDF8",
  },
  headerSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  msgRow: {
    marginBottom: 12,
    maxWidth: "82%",
  },
  msgRowMe: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  msgRowOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  senderLabelMe: {
    color: "#34D399",
  },
  senderLabelDispatch: {
    color: "#38BDF8",
  },
  senderLabelResponder: {
    color: "#F59E0B",
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  msgBubbleMe: {
    backgroundColor: "#0284C7",
    borderBottomRightRadius: 2,
  },
  msgBubbleResponder: {
    backgroundColor: "#78350F",
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: "#B45309",
  },
  msgBubbleOther: {
    backgroundColor: "#334155",
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTextMe: {
    color: "#FFFFFF",
  },
  msgTextOther: {
    color: "#F8FAFC",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  input: {
    flex: 1,
    height: 42,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
