export function documentUrl(path: string | null | undefined): string {
    if (!path) {
        return '';
    }
    if (
        path.startsWith('data:') ||
        path.startsWith('http://') ||
        path.startsWith('https://') ||
        path.startsWith('blob:')
    ) {
        return path;
    }
    if (path.startsWith('/documents?') || path.startsWith('/documents/')) {
        return path;
    }
    if (path.startsWith('/') && !path.startsWith('/storage/')) {
        return path;
    }
    const clean = path.replace(/^\/storage\//, '').replace(/^\//, '');
    return `/documents?path=${encodeURIComponent(clean)}`;
}
