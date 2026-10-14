import type {
  ApiResponse,
  Comment,
  CommentListApiResponse,
} from "@/types";

import { apiClient } from "../client";

export const commentApi = {
  /**
   * Lists comments for a blog post.
   *
   * @param blogId - ID of the blog post.
   * @returns A promise containing the comments and total count.
   */
  list(blogId: string) {
    return apiClient<CommentListApiResponse>(`/blog/${blogId}/comments`, {
      method: "GET",
    });
  },

  /**
   * Creates a comment on a blog post.
   *
   * @param blogId - ID of the blog post.
   * @param content - Text content of the comment.
   * @returns A promise containing the created comment.
   */
  create(blogId: string, content: string) {
    return apiClient<ApiResponse<Comment>>(`/blog/${blogId}/comments`, {
      method: "POST",
      data: { content },
    });
  },

  /**
   * Adds a reply to a comment.
   *
   * @param commentId - ID of the comment to reply to.
   * @param content - Text content of the reply.
   * @returns A promise containing the updated comment.
   */
  addReply(commentId: string, content: string) {
    return apiClient<ApiResponse<Comment>>(`/comments/${commentId}/replies`, {
      method: "POST",
      data: { content },
    });
  },

  /**
   * Deletes a comment.
   *
   * @param commentId - ID of the comment to delete.
   * @returns A promise containing the deletion response.
   */
  delete(commentId: string) {
    return apiClient<ApiResponse<null>>(`/comments/${commentId}`, {
      method: "DELETE",
    });
  },

  /**
   * Deletes a reply from a comment.
   *
   * @param commentId - ID of the parent comment.
   * @param replyId - ID of the reply to delete.
   * @returns A promise containing the updated comment.
   */
  deleteReply(commentId: string, replyId: string) {
    return apiClient<ApiResponse<Comment>>(
      `/comments/${commentId}/replies/${replyId}`,
      {
        method: "DELETE",
      },
    );
  },
};
