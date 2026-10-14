export interface CommentUser {
  _id: string;
  name?: string;
  email?: string;
}

/**
 * Reply content and metadata returned for a comment.
 */
export interface Reply {
  _id: string;
  content: string;
  user?: CommentUser;
  author?: CommentUser;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Comment content, author, replies, and timestamps.
 */
export interface Comment {
  _id: string;
  blog: string;
  content: string;
  user?: CommentUser;
  author?: CommentUser;
  replies: Reply[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Pagination metadata for a comment list.
 */
export interface CommentListMeta {
  total: number;
}

/**
 * API response returned when listing comments for a blog.
 */
export interface CommentListApiResponse {
  result: Comment[];
  message: string;
  meta: CommentListMeta;
}