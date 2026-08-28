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
  Image as RNImage,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Phone,
  Image as ImageIcon,
  Send,
  ChevronLeft,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  subscribeToIncidentChat,
  sendIncidentChatMessage,
  uploadImageToStorage,
  startIncidentCallSession,
  acceptIncidentCallSession,
  declineIncidentCallSession,
} from "@packages/firebase";
import { useAppTheme } from "@/hooks/useAppTheme";
import CivilianCallModal from "./CivilianCallModal";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";

export default function CivilianIncidentChatModal({
  visible,
  onClose,
  incident,
  user,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [activeCallSession, setActiveCallSession] = useState(null);
  const flatListRef = useRef(null);

  const incidentId = incident?.id || "";
  const responderName =
    incident?.responderName || incident?.responder || incident?.dispatcherName || "Emergency Dispatch";

  useEffect(() => {
    if (!visible || !incidentId) return;

    const unsubscribe = subscribeToIncidentChat(incidentId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [visible, incidentId]);

  const formatTimestamp = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date =
        dateValue instanceof Date
          ? dateValue
          : typeof dateValue?.toDate === "function"
          ? dateValue.toDate()
          : new Date(dateValue);

      if (isNaN(date.getTime())) return "";

      return date
        .toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase();
    } catch {
      return "";
    }
  };

  const handleSend = async (overrideText, extraPayload = {}) => {
    const textToSend = (overrideText ?? inputText).trim();
    if ((!textToSend && !extraPayload.imageUrl) || !incidentId || isSending) return;

    setIsSending(true);
    try {
      await sendIncidentChatMessage(incidentId, {
        senderId: user?.uid || user?.id,
        senderName: user?.displayName || user?.fullName || user?.name || "Citizen",
        senderRole: "civilian",
        text: textToSend,
        ...extraPayload,
      });
      if (!overrideText) {
        setInputText("");
      }
    } catch (error) {
      console.error("[CivilianIncidentChatModal] Send error:", error);
      Alert.alert("Send Error", "Failed to send message. Please check your internet connection.");
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = async () => {
    if (isUploadingImage || isSending) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to send emergency scene images to the command center."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.75,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const localUri = result.assets[0].uri;
        setIsUploadingImage(true);

        try {
          // Upload to Firebase Storage (emergencies/photos/) so Command Center and apps can load it
          const uploadedUrl = await uploadImageToStorage(
            localUri,
            `emergencies/photos/`
          );

          await handleSend(inputText.trim() || "Sent an image", {
            imageUrl: uploadedUrl,
          });
        } catch (uploadErr) {
          console.error("[CivilianIncidentChatModal] Image upload error:", uploadErr);
          Alert.alert("Upload Failed", "Could not upload image to dispatch. Please try again.");
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (err) {
      console.warn("Error picking image:", err);
      setIsUploadingImage(false);
    }
  };

  const handleStartCall = async () => {
    if (!incidentId) return;
    try {
      const targetId = incident?.responder || incident?.assignedResponderId;
      const session = await startIncidentCallSession({
        incidentId: incident.id,
        callerUserId: user?.uid || user?.id,
        callerRole: "civilian",
        callerName: user?.displayName || user?.fullName || user?.name || "Citizen",
        callerPhone: user?.phoneNumber || user?.phone || null,
        targetRole: targetId ? "responder" : "dispatcher",
        targetName: responderName,
        assignedResponderId: targetId || null,
        incidentReferenceNumber: incident.id ? `APP-${incident.id.slice(-5).toUpperCase()}` : null,
        incidentType: incident.incidentType,
        incidentLocationText: incident.locationText,
      });
      setActiveCallSession(session);
      setIsCallModalVisible(true);
    } catch (err) {
      console.error("[CivilianIncidentChatModal] Call error:", err);
      Alert.alert("Call Notice", "Calling emergency dispatch hotline: 911");
    }
  };

  if (!visible) return null;

  const brandPrimary = colors.primary || "#10B981";

  const renderMessageItem = ({ item }) => {
    const isMe = item.senderRole === "civilian" || item.senderId === (user?.uid || user?.id);
    const imageUrl =
      item.imageUrl ||
      item.imageUri ||
      item.photoUrl ||
      (typeof item.text === "string" &&
      item.text.match(/https:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\?alt=media)[^\s]*/i)
        ? item.text.match(/https:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\?alt=media)[^\s]*/i)?.[0]
        : null);
    const timeStr = formatTimestamp(item.createdAt);

    return (
      <View style={[styles.msgContainer, isMe ? styles.msgContainerMe : styles.msgContainerOther]}>
        {/* Message Bubble */}
        <View
          style={[
            styles.msgBubble,
            isMe
              ? [styles.msgBubbleMe, { backgroundColor: brandPrimary }]
              : [
                  styles.msgBubbleOther,
                  {
                    backgroundColor: colors.card || "#FFFFFF",
                    borderColor: colors.border || "#F1F5F9",
                  },
                ],
          ]}
        >
          {imageUrl ? (
            <View style={styles.imageMsgWrap}>
              <RNImage
                source={{ uri: imageUrl }}
                style={styles.imageMsg}
                resizeMode="cover"
              />
              {item.text && item.text !== "Sent an image" && (
                <Text
                  style={[
                    styles.msgText,
                    isMe
                      ? styles.msgTextMe
                      : [styles.msgTextOther, { color: colors.text || "#1E293B" }],
                    { marginTop: 6 },
                  ]}
                >
                  {item.text}
                </Text>
              )}
            </View>
          ) : (
            <Text
              style={[
                styles.msgText,
                isMe
                  ? styles.msgTextMe
                  : [styles.msgTextOther, { color: colors.text || "#1E293B" }],
              ]}
            >
              {item.text}
            </Text>
          )}
        </View>

        {/* Timestamp outside and below bubble */}
        {timeStr ? (
          <Text
            style={[
              styles.timeText,
              { color: colors.textMuted || "#94A3B8" },
              isMe ? styles.timeTextMe : styles.timeTextOther,
            ]}
          >
            {timeStr}
          </Text>
        ) : null}
      </View>
    );
  };

  // Header display name (clean name without 'Hi,')
  const headerDisplayName =
    responderName.length > 22
      ? responderName.slice(0, 22) + "..."
      : responderName;

  const canSend = Boolean(inputText.trim()) && !isSending && !isUploadingImage;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.background || "#F8F9FA" }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background || "#F8F9FA",
              borderBottomColor: colors.border || "rgba(0, 0, 0, 0.05)",
              paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 12 : 8) + 4,
            },
          ]}
        >
          {/* Left: Back / Close & Profile with Online Dot */}
          <View style={styles.headerLeftGroup}>
            <Pressable
              onPress={onClose}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Close chat"
              hitSlop={8}
            >
              <ChevronLeft size={24} color={colors.text || "#1E293B"} strokeWidth={2.4} />
            </Pressable>

            <View style={styles.avatarWrap}>
              <RNImage
                source={{ uri: DEFAULT_AVATAR }}
                style={styles.avatarImage}
                defaultSource={{ uri: DEFAULT_AVATAR }}
              />
              {/* Online Indicator Green Badge */}
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.nameColumn}>
              <Text
                style={[styles.nameText, { color: colors.text || "#1E293B" }]}
                numberOfLines={1}
              >
                {headerDisplayName}
              </Text>
              <Text style={[styles.onlineText, { color: colors.textSecondary || "#64748B" }]}>
                Online
              </Text>
            </View>
          </View>

          {/* Right: Call Button Only */}
          <View style={styles.headerRightGroup}>
            <Pressable
              onPress={handleStartCall}
              style={({ pressed }) => [
                styles.headerActionBtn,
                {
                  backgroundColor: colors.card || "#FFFFFF",
                  borderColor: colors.border || "#E5E7EB",
                },
                pressed && styles.headerActionBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Call dispatcher"
              hitSlop={6}
            >
              <Phone size={19} color={colors.text || "#1E293B"} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          style={[styles.container, { backgroundColor: colors.background || "#F8F9FA" }]}
        >
          {/* Messages Stream */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || String(Math.random())}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.dateHeader}>
                <Text style={[styles.dateHeaderText, { color: colors.textSecondary || "#475569" }]}>
                  Today
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: colors.textSecondary || "#64748B" }]}>
                  Direct Link with Emergency Dispatch
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted || "#94A3B8" }]}>
                  Send instant updates or scene photos. The command center receives messages in real time.
                </Text>
              </View>
            }
          />

          {/* Input Footer Bar */}
          <View
            style={[
              styles.footerContainer,
              {
                backgroundColor: colors.background || "#F8F9FA",
                borderTopColor: colors.border || "rgba(0, 0, 0, 0.05)",
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <View
              style={[
                styles.inputCapsule,
                {
                  backgroundColor: colors.card || "#FFFFFF",
                  borderColor: colors.border || "#E2E8F0",
                },
              ]}
            >
              {/* Text Input */}
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message"
                placeholderTextColor={colors.placeholder || "#94A3B8"}
                style={[styles.textInput, { color: colors.text || "#1E293B" }]}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={() => canSend && handleSend()}
              />

              {/* Photo / Gallery Icon with loading state */}
              <Pressable
                onPress={handlePickImage}
                disabled={isUploadingImage || isSending}
                style={styles.innerIconBtn}
                hitSlop={6}
                accessibilityLabel="Send photo"
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={brandPrimary} />
                ) : (
                  <ImageIcon size={21} color={colors.textSecondary || "#64748B"} />
                )}
              </Pressable>
            </View>

            {/* Right Action Button: Strictly Send Icon */}
            <Pressable
              onPress={() => canSend && handleSend()}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.actionBrandBtn,
                { backgroundColor: brandPrimary, shadowColor: brandPrimary },
                !canSend && styles.actionBrandBtnDisabled,
                pressed && canSend && styles.actionBrandBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={19} color="#FFFFFF" strokeWidth={2.4} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Voice Call Modal */}
      <CivilianCallModal
        visible={isCallModalVisible}
        onClose={() => {
          setIsCallModalVisible(false);
          setActiveCallSession(null);
        }}
        callSession={activeCallSession}
        onAnswer={async () => {
          if (activeCallSession?.id) {
            await acceptIncidentCallSession(activeCallSession.id, {
              uid: user?.uid || user?.id,
              name: user?.name || "Citizen",
            }).catch(() => undefined);
          }
        }}
        onDecline={async () => {
          if (activeCallSession?.id) {
            await declineIncidentCallSession(activeCallSession.id, "Declined").catch(() => undefined);
          }
          setIsCallModalVisible(false);
          setActiveCallSession(null);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  backBtn: {
    padding: 2,
    marginRight: 2,
  },
  avatarWrap: {
    position: "relative",
    width: 44,
    height: 44,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  nameColumn: {
    marginLeft: 4,
    justifyContent: "center",
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerActionBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  dateHeader: {
    alignItems: "center",
    marginVertical: 14,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
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
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  msgContainer: {
    marginBottom: 14,
    maxWidth: "80%",
  },
  msgContainerMe: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  msgContainerOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  msgBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  msgBubbleMe: {
    borderTopRightRadius: 6,
  },
  msgBubbleOther: {
    borderTopLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1.5,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "500",
  },
  msgTextMe: {
    color: "#FFFFFF",
  },
  msgTextOther: {
    color: "#1E293B",
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  timeTextMe: {
    marginRight: 4,
    textAlign: "right",
  },
  timeTextOther: {
    marginLeft: 4,
    textAlign: "left",
  },
  imageMsgWrap: {
    gap: 4,
  },
  imageMsg: {
    width: 220,
    height: 150,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  footerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  innerIconBtn: {
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 14.5,
    paddingVertical: 0,
  },
  actionBrandBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  actionBrandBtnDisabled: {
    opacity: 0.4,
  },
  actionBrandBtnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});
