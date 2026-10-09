export interface AdminUser {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
}

/** Blog data returned by administrator endpoints. */
export interface AdminBlog {
  _id: string;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "published" | "unpublished" | "rejected" | "submitted" | "featured";
  image?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    _id: string;
    name?: string;
    email?: string;
  };
  category?: {
    _id: string;
    title?: string;
  };
  tags: string[];
}

/** Category data returned by administrator endpoints. */
export interface AdminCategory {
  _id: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

