/** Short navigation labels; product names and catalog records stay unchanged. */
export function categoryLabel(name: string): string {
  const label = name
    .replace(/^DEMO\s*[–—-]\s*/i, '')
    .replace(/^tai nghe\s+/i, '')
    .trim();
  return label
    ? label.charAt(0).toLocaleUpperCase('vi') + label.slice(1)
    : name;
}
