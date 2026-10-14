import { env } from "@/lib/config/env";

export interface ImageReference {
  key?: string;
  url?: string;
}

export const imgSrc = (img?: ImageReference | string, folder = "blogs") => {
  if (!img) return undefined;

  if (typeof img === "string") {
    if (/^https?:\/\//i.test(img)) return img;
    return `${env.apiBaseUrl.replace(/\/$/, "")}/uploads/${folder}/${img.replace(
      /^\/+/,
      "",
    )}`;
  }

  return (
    img.url ??
    (img.key
      ? `${env.apiBaseUrl.replace(/\/$/, "")}/uploads/${folder}/${img.key.replace(
          /^\/+/,
          "",
        )}`
      : undefined)
  );
};
