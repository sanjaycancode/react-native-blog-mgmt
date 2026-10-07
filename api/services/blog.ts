import {apiClient} from "../client";
import {Blog, BlogListApiResponse, ApiResponse, ToggleLikeResponse} from "@/types/blog";

export const blogApi = {
  /**
   * Lists blogs with optional pagination and filters.
   *
   * @param params - Pagination, search, and category filters.
   * @returns A promise containing the matching blogs.
   */
  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tag?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
     if (params?.tag) query.set("tag", params.tag);

    const qs = query.toString();
    return apiClient.get<BlogListApiResponse>(`/blog${qs ? `?${qs}` : ""}`);
  },

  /** Retrieves blogs owned by the authenticated user. */
  myBlogs() {
    return apiClient.get<BlogListApiResponse>("/blog/me");
  },

  /**
   * Lists blogs written by an author.
   *
   * @param authorId - ID of the author.
   * @param params - Optional pagination parameters.
   * @returns A promise containing the author's blogs.
   */
  getByAuthor(authorId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    return apiClient<BlogListApiResponse>(
      `/blog/author/${authorId}${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },

  /**
   * Creates a blog.
   *
   * @param data - Form data containing the blog fields and optional image.
   * @returns A promise containing the created blog.
   */
  create(data: FormData) {
    return apiClient<ApiResponse<Blog>>("/blog/create", {
      method: "POST",
      data,
    });
  },

  /**
   * Retrieves a blog by ID.
   *
   * @param id - ID of the blog to retrieve.
   * @returns A promise containing the requested blog.
   */
  getById(id: string) {
    return apiClient<ApiResponse<Blog>>(`/blog/${id}`, { method: "GET" });
  },

  /**
   * Retrieves a published blog by slug.
   *
   * @param slug - Blog slug.
   * @returns A promise containing the requested blog.
   */
  getBySlug(slug: string) {
    return apiClient<ApiResponse<Blog>>(`/blog/slug/${slug}`, {
      method: "GET",
    });
  },

  /**
   * Retrieves a draft blog by slug.
   *
   * @param slug - Draft blog slug.
   * @returns A promise containing the requested draft.
   */
  getDraftBySlug(slug: string) {
    return apiClient<ApiResponse<Blog>>(`/blog/draft/slug/${slug}`, {
      method: "GET",
    });
  },

  /**
   * Updates a blog by ID.
   *
   * @param id - ID of the blog to update.
   * @param data - Form data containing updated blog fields.
   * @returns A promise containing the updated blog.
   */
  update(id: string, data: FormData) {
    return apiClient<ApiResponse<Blog>>(`/blog/${id}`, {
      method: "PUT",
      data,
    });
  },

  /**
   * Updates a blog by slug.
   *
   * @param slug - Slug of the blog to update.
   * @param data - Form data containing updated blog fields.
   * @returns A promise containing the updated blog.
   */
  updateBySlug(slug: string, data: FormData) {
    return apiClient<ApiResponse<Blog>>(`/blog/slug/${slug}`, {
      method: "PUT",
      data,
    });
  },

  /**
   * Deletes a blog by ID.
   *
   * @param id - ID of the blog to delete.
   * @returns A promise containing the deleted blog response.
   */
  delete(id: string) {
    return apiClient<ApiResponse<Blog>>(`/blog/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Changes a published blog to an unpublished state.
   *
   * @param id - ID of the blog to unpublish.
   * @returns A promise containing the updated blog response.
   */
  unpublish(id: string) {
    return apiClient<ApiResponse<Blog>>(`/blog/${id}/unpublish`, {
      method: "PATCH",
    });
  },

  /**
   * Toggles the authenticated user's like on a blog.
   *
   * @param id - ID of the blog to like or unlike.
   * @returns A promise containing the updated like state and count.
   */
  toggleLike(id: string) {
    return apiClient<ApiResponse<ToggleLikeResponse>>(`/blog/${id}/like`, {
      method: "PUT",
    });
  },
};

