import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";

import { commentApi } from "@/api/services";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { Comment } from "@/types/comment";

import { getErrorMessage } from "@/utils/errorMessage";

type BlogCommentsProps = {
  blogId: string;
  isOpen?: boolean;
  alwaysOpen?: boolean;
  onCommentCountChange?: (count: number) => void;
};

// Matches the red used for destructive text actions on the web.
const DANGER_COLOR = "#ef4444";

// Left offset of nested content: avatar (32) + gap (8)
const NEST_OFFSET = 40;

function getUserId(user?: Comment["user"]) {
  return user?._id;
}

function formatRelative(value?: string) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";

  const mins = Math.floor((Date.now() - time) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + second).toUpperCase();
}

function InitialsAvatar({ name, size = 32 }: { name?: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.secondary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ThemedText
        variant="caption"
        style={{
          color: colors.secondaryForeground,
          fontSize: size <= 24 ? 10 : 12,
          fontWeight: "700",
          lineHeight: size <= 24 ? 12 : 14,
        }}
      >
        {getInitials(name)}
      </ThemedText>
    </View>
  );
}

function SendButton({
  onPress,
  disabled,
  loading,
  size = 18,
  label,
}: {
  onPress: () => void;
  disabled: boolean;
  loading?: boolean;
  size?: number;
  label: string;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.sendButton,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name="paper-plane"
          size={size}
          color={disabled ? colors.mutedForeground : colors.primary}
        />
      )}
    </Pressable>
  );
}

function CommentSkeleton() {
  const { colors, spacing, radii } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.skeletonRow, { gap: spacing.sm, opacity: pulse }]}
    >
      <View style={[styles.skeletonAvatar, { backgroundColor: colors.muted }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{
            height: 40,
            width: "75%",
            borderRadius: radii.lg ?? radii.md,
            backgroundColor: colors.muted,
          }}
        />
        <View
          style={{
            height: 10,
            width: 70,
            marginLeft: 8,
            borderRadius: 5,
            backgroundColor: colors.muted,
          }}
        />
      </View>
    </Animated.View>
  );
}

export function BlogComments({
  blogId,
  isOpen = true,
  alwaysOpen = false,
  onCommentCountChange,
}: BlogCommentsProps) {
  const { colors, spacing, typography } = useTheme();
  const { session } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(alwaysOpen);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingReplyTo, setSubmittingReplyTo] = useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const setCommentCount = useCallback(
    (nextCount: number) => {
      setCount(nextCount);
      onCommentCountChange?.(nextCount);
    },
    [onCommentCountChange],
  );

  const loadComments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await commentApi.list(blogId);
      const result = response.data.result ?? [];
      setComments(result);
      setHasLoaded(true);
      setCommentCount(response.data.meta?.total ?? result.length);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [blogId, setCommentCount]);

  useEffect(() => {
    if (isOpen && !hasLoaded) void loadComments();
  }, [hasLoaded, isOpen, loadComments]);

  const requireLogin = useCallback(() => {
    if (session) return true;
    showToast("Log in to comment on this story.");
    router.push("/login");
    return false;
  }, [router, session, showToast]);

  const submitComment = useCallback(async () => {
    const content = draft.trim();
    if (!content || submitting || !requireLogin()) return;
    if (content.length > 2000) {
      showToast("Comment must be 2,000 characters or less.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await commentApi.create(blogId, content);
      setComments((current) => [response.data.result, ...current]);
      setCommentCount(count + 1);
      setDraft("");
      setShowAll(true);
      showToast("Comment posted");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  }, [
    blogId,
    count,
    draft,
    requireLogin,
    setCommentCount,
    showToast,
    submitting,
  ]);

  const submitReply = useCallback(
    async (commentId: string) => {
      const content = replyDraft.trim();
      if (!content || submittingReplyTo || !requireLogin()) return;
      if (content.length > 1000) {
        showToast("Reply must be 1,000 characters or less.", "error");
        return;
      }

      setSubmittingReplyTo(commentId);
      try {
        const response = await commentApi.addReply(commentId, content);
        setComments((current) =>
          current.map((comment) =>
            comment._id === commentId ? response.data.result : comment,
          ),
        );
        setReplyDraft("");
        setReplyingTo(null);
        showToast("Reply added");
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      } finally {
        setSubmittingReplyTo(null);
      }
    },
    [replyDraft, requireLogin, showToast, submittingReplyTo],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (deletingId) return;

      setDeletingId(commentId);
      try {
        await commentApi.delete(commentId);
        setComments((current) =>
          current.filter((comment) => comment._id !== commentId),
        );
        setCommentCount(Math.max(0, count - 1));
        showToast("Comment deleted");
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      } finally {
        setDeletingId(null);
      }
    },
    [count, deletingId, setCommentCount, showToast],
  );

  const deleteReply = useCallback(
    async (commentId: string, replyId: string) => {
      if (deletingId) return;

      setDeletingId(replyId);
      try {
        const response = await commentApi.deleteReply(commentId, replyId);
        setComments((current) =>
          current.map((comment) =>
            comment._id === commentId ? response.data.result : comment,
          ),
        );
        showToast("Reply deleted");
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, showToast],
  );

  const currentUserId = session?.user.id;
  const isAdmin = session?.user.role === "admin";
  const visibleComments =
    showAll || alwaysOpen || comments.length <= 2
      ? comments
      : comments.slice(0, 2);

  if (!isOpen) return null;

  return (
    <View style={{ gap: spacing.sm, backgroundColor:colors.card }}>
      <ThemedText
        variant="body"
        style={{ fontWeight: typography.weights.semibold }}
      >
        Comments{count ? ` (${count})` : ""}
      </ThemedText>

      <View style={[styles.inputRow, { gap: spacing.sm }]}>
        <View style={styles.inputAvatar}>
          <InitialsAvatar name={session?.user.name ?? "Guest"} />
        </View>
        <View style={styles.inputWrap}>
          <ThemedTextInput
            accessibilityLabel="Write a comment"
            value={draft}
            onChangeText={setDraft}
            maxLength={2000}
            placeholder={
              session
                ? "Write a comment..."
                : "Log in to join the conversation..."
            }
            multiline
            textAlignVertical="center"
            editable={!submitting}
            onFocus={() => {
              if (!session) {
                showToast("Log in to comment on this story.", "error");
                router.push("/login");
              }
            }}
            style={styles.commentInput}
            containerStyle={styles.pillContainer}
          />
          <View style={styles.sendSlot}>
            <SendButton
              label="Send comment"
              loading={submitting}
              disabled={submitting || !draft.trim()}
              onPress={() => void submitComment()}
            />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ gap: spacing.md, paddingTop: spacing.xs }}>
          <CommentSkeleton />
          <CommentSkeleton />
        </View>
      ) : loadError ? (
        <View style={[styles.stateRow, { gap: spacing.sm }]}>
          <ThemedText variant="bodySmall" semantic="muted">
            Could not load comments: {loadError}
          </ThemedText>
          <ThemedButton
            title="Retry"
            variant="outlined"
            size="small"
            onPress={() => void loadComments()}
          />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={26}
            color={colors.mutedForeground}
          />
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            style={{ textAlign: "center" }}
          >
            No comments yet. Be the first to join the conversation!
          </ThemedText>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {visibleComments.map((comment) => {
            const author = comment.user ?? comment.author;
            const canDelete =
              isAdmin ||
              (Boolean(currentUserId) &&
                (getUserId(comment.user) ?? getUserId(comment.author)) ===
                  currentUserId);

            return (
              <View key={comment._id} style={{ gap: spacing.xs }}>
                <View style={[styles.row, { gap: spacing.xs }]}>
                  <View style={styles.avatarTop}>
                    <InitialsAvatar name={author?.name} />
                  </View>
                  <View style={styles.flex}>
                    <View
                      style={[
                        styles.bubble,
                        { backgroundColor: colors.muted },
                      ]}
                    >
                      <ThemedText
                        variant="caption"
                        numberOfLines={1}
                        style={{ fontWeight: typography.weights.semibold }}
                      >
                        {author?.name ?? "Anonymous"}
                      </ThemedText>
                      <ThemedText variant="bodySmall" style={{ marginTop: 2 }}>
                        {comment.content}
                      </ThemedText>
                    </View>

                    <View style={styles.actionRow}>
                      <ThemedText variant="caption" semantic="muted">
                        {formatRelative(comment.createdAt)}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Reply to ${author?.name ?? "comment"}`}
                        hitSlop={6}
                        onPress={() => {
                          if (!requireLogin()) return;
                          setReplyingTo((current) =>
                            current === comment._id ? null : comment._id,
                          );
                          setReplyDraft("");
                        }}
                      >
                        <ThemedText
                          variant="caption"
                          style={{
                            color: colors.mutedForeground,
                            fontWeight: typography.weights.semibold,
                          }}
                        >
                          Reply
                        </ThemedText>
                      </Pressable>
                      {canDelete ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete comment"
                          disabled={deletingId === comment._id}
                          hitSlop={6}
                          style={{
                            opacity: deletingId === comment._id ? 0.5 : 1,
                          }}
                          onPress={() =>
                            Alert.alert(
                              "Delete comment?",
                              "Are you sure you want to delete this comment?",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () =>
                                    void deleteComment(comment._id),
                                },
                              ],
                            )
                          }
                        >
                          <ThemedText
                            variant="caption"
                            style={{
                              color: DANGER_COLOR,
                              fontWeight: typography.weights.semibold,
                            }}
                          >
                            {deletingId === comment._id
                              ? "Deleting..."
                              : "Delete"}
                          </ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>

                {comment.replies?.length ? (
                  <View
                    style={[
                      styles.replies,
                      {
                        borderLeftColor: colors.border,
                        marginLeft: NEST_OFFSET,
                        paddingLeft: spacing.sm,
                        gap: spacing.sm,
                      },
                    ]}
                  >
                    {comment.replies.map((reply) => {
                      const replyAuthor = reply.user ?? reply.author;
                      const canDeleteReply =
                        isAdmin ||
                        (Boolean(currentUserId) &&
                          (getUserId(reply.user) ?? getUserId(reply.author)) ===
                            currentUserId);

                      return (
                        <View
                          key={reply._id}
                          style={[styles.row, { gap: spacing.sm }]}
                        >
                          <View style={styles.avatarTop}>
                            <InitialsAvatar name={replyAuthor?.name} size={24} />
                          </View>
                          <View style={styles.flex}>
                            <View
                              style={[
                                styles.bubble,
                                styles.replyBubble,
                                { backgroundColor: colors.muted },
                              ]}
                            >
                              <ThemedText
                                variant="caption"
                                numberOfLines={1}
                                style={{
                                  fontWeight: typography.weights.semibold,
                                }}
                              >
                                {replyAuthor?.name ?? "Anonymous"}
                              </ThemedText>
                              <ThemedText
                                variant="caption"
                                style={{ marginTop: 2 }}
                              >
                                {reply.content}
                              </ThemedText>
                            </View>
                            <View style={styles.actionRow}>
                              <ThemedText variant="caption" semantic="muted">
                                {formatRelative(reply.createdAt)}
                              </ThemedText>
                              {canDeleteReply ? (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel="Delete reply"
                                  disabled={deletingId === reply._id}
                                  hitSlop={6}
                                  style={{
                                    opacity: deletingId === reply._id ? 0.5 : 1,
                                  }}
                                  onPress={() =>
                                    Alert.alert(
                                      "Delete reply?",
                                      "Are you sure you want to delete this reply?",
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                          text: "Delete",
                                          style: "destructive",
                                          onPress: () =>
                                            void deleteReply(
                                              comment._id,
                                              reply._id,
                                            ),
                                        },
                                      ],
                                    )
                                  }
                                >
                                  <ThemedText
                                    variant="caption"
                                    style={{ color: DANGER_COLOR }}
                                  >
                                    {deletingId === reply._id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </ThemedText>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {replyingTo === comment._id ? (
                  <View
                    style={[
                      styles.row,
                      { marginLeft: NEST_OFFSET, gap: spacing.sm },
                    ]}
                  >
                    <View style={styles.replyInputAvatar}>
                      <InitialsAvatar
                        name={session?.user.name ?? "You"}
                        size={24}
                      />
                    </View>
                    <View style={styles.inputWrap}>
                      <ThemedTextInput
                        accessibilityLabel="Write a reply"
                        value={replyDraft}
                        onChangeText={setReplyDraft}
                        maxLength={1000}
                        placeholder={`Reply to ${author?.name ?? "comment"}...`}
                        autoFocus
                        returnKeyType="send"
                        onSubmitEditing={() => void submitReply(comment._id)}
                        editable={submittingReplyTo !== comment._id}
                        style={styles.replyInput}
                        containerStyle={styles.pillContainer}
                      />
                      <View style={styles.sendSlotCentered}>
                        <SendButton
                          label="Send reply"
                          size={16}
                          loading={submittingReplyTo === comment._id}
                          disabled={
                            submittingReplyTo === comment._id ||
                            !replyDraft.trim()
                          }
                          onPress={() => void submitReply(comment._id)}
                        />
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {!alwaysOpen && !showAll && comments.length > 2 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll(true)}
          style={{ paddingLeft: 40 }}
        >
          <ThemedText
            variant="caption"
            style={{
              color: colors.mutedForeground,
              fontWeight: typography.weights.semibold,
            }}
          >
            View all {comments.length} comments
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarTop: {
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  inputAvatar: {
    marginTop: 4,
  },
  replyInputAvatar: {
    marginTop: 6,
  },
  inputWrap: {
    flex: 1,
    position: "relative",
  },
  pillContainer: {
    borderRadius: 20,
    
  },
  commentInput: {
    minHeight: 40,
    maxHeight: 120,
    paddingRight: 44,
    fontSize:13
  },
  replyInput: {
    minHeight: 36,
    paddingRight: 40,
    fontSize:13
  },
  sendSlot: {
    position: "absolute",
    right: 6,
    bottom: 6,
  },
  sendSlotCentered: {
    position: "absolute",
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  replyBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    paddingLeft: 8,
  },
  replies: {
    borderLeftWidth: 2,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  stateRow: {
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
});