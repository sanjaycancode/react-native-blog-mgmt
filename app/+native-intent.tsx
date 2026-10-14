export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'https://blog-ncc19.vercel.app');

    // example: website /post/some-slug -> app /blog/some-slug
    if (url.pathname.startsWith('/blogs/')) {
      return url.pathname.replace('/blogs/', '/blog/');
    }else if(url.pathname.startsWith("/authors/")){
        return url.pathname.replace("/authors/", "/profile/")
    }

    return url.pathname + url.search;
  } catch {
    return '/';
  }
}