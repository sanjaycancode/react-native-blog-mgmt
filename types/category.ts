export interface Category {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}


export interface CategoryListResponse {
  result: Category[];
  message: string;
  meta: null;
}