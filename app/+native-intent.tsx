export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'https://blog-ncc19.vercel.app');
    let pathname = url.pathname;

    if (pathname.startsWith('/blogs/')) {
      pathname = pathname.replace('/blogs/', '/blog/');
    } else if (pathname === '/blogs') {
      pathname = '/blog';
    } else if (pathname.startsWith('/authors/')) {
      pathname = pathname.replace('/authors/', '/profile/');
    } else if (pathname === '/authors') {
      pathname = '/profile';
    }

    return pathname + url.search;
  } catch {
    return '/';
  }
}