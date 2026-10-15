import { apiClient } from "@/api/client"; // same import path you used before
import { SearchResponse } from "@/types/search";



export const searchApi = {
  search(q: string) {
    return apiClient.get<SearchResponse>("/search", { params: { q } });
  },
};