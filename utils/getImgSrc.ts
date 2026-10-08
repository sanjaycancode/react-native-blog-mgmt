const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ImageReference {
  key?: string;
  url?: string;
}

export const imgSrc = (img?: ImageReference | string, folder = "blogs") => {
  if (!img) return undefined;

  if (typeof img === "string") {
    return `${API_URL}/uploads/${folder}/${img}`;
  }

  return (
    img.url ?? (img.key ? `${API_URL}/uploads/${folder}/${img.key}` : undefined)
  );
};
