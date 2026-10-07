import { apiClient } from "../client";
import { CategoryListResponse,Category } from "@/types";

export const categoryApi = {

  list() {
    return apiClient<CategoryListResponse>("/category", { method: "GET" });
  },


  getById(id: string) {
    return apiClient<{ result: Category; message: string; meta: null }>(
      `/category/${id}`,
      { method: "GET" },
    );
  },

  create(data: { title: string }) {
    return apiClient<{ result: Category; message: string; meta: null }>(
      "/category/create",
      { method: "POST", data },
    );
  },
};
