/**
 * A user-supplied book wins. Static hosts may return their HTML shell for a
 * missing path, so a successful status alone does not prove a PDF exists.
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<string>}
 */
export async function selectPdfUrl(fetcher = fetch) {
  try {
    const response = await fetcher('/book.pdf', {method: 'HEAD'});
    const html = response.headers?.get('content-type')?.toLowerCase().includes('text/html');
    if (response.ok && !html) return '/book.pdf';
    if (response.status !== 404 && response.status !== 410 && !html) return '/book.pdf';
  } catch {
    // Keep the user path authoritative if availability cannot be checked.
    return '/book.pdf';
  }
  return '/EXAMPLE_BOOK.pdf';
}
