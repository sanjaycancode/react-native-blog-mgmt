import { ApiResponse } from "@/types";
import { AdminBlog, AdminCategory, AdminUser } from "@/types/admin";
import { apiClient } from "../client";

/** User data returned by administrator endpoints. */


/** Client methods for administrator user, category, and blog operations. */
export const adminApi = {
  /** Deletes a blog by ID. */
  deleteBlog(id: string) {
    return apiClient<ApiResponse<AdminBlog>>(`/admin/${id}`, {
      method: "DELETE",
    });
  },

  /** Promotes a user to the administrator role. */
  promoteToAdmin(id: string) {
    return apiClient<{ message: string; user: AdminUser }>(`/admin/${id}`, {
      method: "PATCH",
    });
  },

  /**
   * Lists users with optional search and role filters.
   *
   * @param params - Optional user search and role filters.
   */
  listUsers(params?: { search?: string; role?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.role) query.set("role", params.role);

    const qs = query.toString();
    return apiClient<AdminUser[]>(`/user${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },

  /** Retrieves a user by ID. */
  getUser(id: string) {
    return apiClient<{ message: string; user: AdminUser }>(`/user/${id}`, {
      method: "GET",
    });
  },

  /**
   * Updates the authenticated administrator's user details.
   *
   * @param data - Optional name and email fields.
   */
  updateUser(data: { name?: string; email?: string }) {
    return apiClient<{ message: string; updatedUser: AdminUser }>("/user", {
      method: "PATCH",
      data,
    });
  },

  /** Deletes a user by ID. */
  deleteUser(id: string) {
    return apiClient<{ message: string }>(`/admin/user/${id}`, { method: "DELETE" });
  },

  /**
   * Creates a user with the specified role.
   *
   * @param data - New user details and role.
   */
  createUser(data: { name: string; email: string; password: string; role: "admin" | "user" }) {
    return apiClient<{ message: string; user: AdminUser }>("/admin/user/create", {
      method: "POST",
      data,
    });
  },

  /** Lists all categories. */
  listCategories() {
    return apiClient<ApiResponse<AdminCategory[]>>("/category", { method: "GET" });
  },

  /** Creates a category. */
  createCategory(data: { title: string }) {
    return apiClient<ApiResponse<AdminCategory>>("/category/create", {
      method: "POST",
      data,
    });
  },

  /** Retrieves a category by ID. */
  getCategory(id: string) {
    return apiClient<ApiResponse<AdminCategory>>(`/category/${id}`, {
      method: "GET",
    });
  },

  /** Updates a category by ID. */
  updateCategory(id: string, data: { title: string }) {
    return apiClient<ApiResponse<AdminCategory>>(`/category/${id}`, {
      method: "PUT",
      data,
    });
  },

  /** Deletes a category by ID. */
  deleteCategory(id: string) {
    return apiClient<ApiResponse<AdminCategory>>(`/category/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Lists all blogs with optional pagination and filters.
   *
   * @param params - Pagination, search, author, and status filters.
   */
  listAllBlogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    author?: string;
    status?: string;
    tag?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.author) query.set("author", params.author);
    if (params?.status) query.set("status", params.status);
    if (params?.tag) query.set("tag", params.tag);

    const qs = query.toString();
    return apiClient<{
      result: AdminBlog[];
      message: string;
      meta: {
        currentPage: number;
        totalPages: number;
        totalBlogs: number;
        limit: number;
      };
    }>(`/admin${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  /** Unpublishes a blog by ID. */
  unpublishBlog(id: string) {
    return apiClient<ApiResponse<AdminBlog>>(`/blog/${id}/unpublish`, {
      method: "PATCH",
    });
  },

  /** Deletes a blog by ID. */
  deleteBlogById(id: string) {
    return apiClient<ApiResponse<AdminBlog>>(`/blog/${id}`, {
      method: "DELETE",
    });
  },

  /** Verifies a submitted blog by ID. */
  verifyBlog(id: string) {
    return apiClient<{ message: string; blog: AdminBlog }>(`/admin/blog/${id}/verify`, {
      method: "PATCH",
    });
  },

  /** Rejects a submitted blog by ID. */
  rejectBlog(id: string) {
    return apiClient<{ message: string; blog: AdminBlog }>(`/admin/blog/${id}/reject`, {
      method: "PATCH",
    });
  },

  /** Promotes a published blog to the featured status. */
  featureBlog(id: string) {
    return apiClient<{ message: string; updatedBlog: AdminBlog }>(
      `/admin/blog/${id}/featured`,
      { method: "PATCH" },
    );
  },
};


