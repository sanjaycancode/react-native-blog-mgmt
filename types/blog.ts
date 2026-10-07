export interface BlogAuthor {
  _id: string;
  name?: string;
  email?: string;
  profile?: {
    avatar?: string | { key?: string; url?: string };
  };
}

export interface BlogCategory {
  _id: string;
  title?: string;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "published" | "unpublished" | "submitted" | "rejected" | "featured";
  image?: string | { key?: string; url?: string };
  createdAt: string;
  updatedAt: string;
  author: BlogAuthor;
  category?: BlogCategory;
  tags?: string[]; 
  likes?: string[];
  views?: number;
}

export interface BlogListMeta {
  currentPage: number;
  totalPages: number;
  totalBlogs: number;
  limit: number;
}

export interface BlogListApiResponse {
  result: Blog[];
  message: string;
  meta: BlogListMeta;
}

export interface ApiResponse<T> {
  result: T;
  message: string;
  meta: null;
}

export interface ToggleLikeResponse {
  likesCount: number;
  liked: boolean;
}