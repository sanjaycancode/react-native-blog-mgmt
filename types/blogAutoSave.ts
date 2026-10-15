// src/types/blogAutosave.ts
import type { ImagePickerAsset } from "expo-image-picker";

// "draft" here is the SERVER status, not the local autosave.
export type BlogStatus = "draft" | "submitted";

export type AutosaveImage = Pick<
  ImagePickerAsset,
  "uri" | "width" | "height" | "fileName" | "mimeType"
>;

export type BlogFormValues = {
  title: string;
  description: string;
  category: string;
  status: BlogStatus;
  tagsInput: string;
  image: AutosaveImage | null;
};

//WE HAVE KEPT VERSION SO THAT IF IN FUTURE WE ADD OR REMAME A FIELD, OLD DRAFTS ON USERS' PHONE HAVE THE OLD SHAPE, WITH VERSION NUMBER WE CAN DETECT THAT OR IGNORE OR MIGRATE THEM INSTEAD OF CRASHING ON UNDEFINED
export const BLOG_AUTOSAVE_VERSION = 1;

//WHAT ACTUALLY SITS IN STORAGE
export type BlogAutosave = BlogFormValues & {
  version: number;
  savedAt: number;
};
