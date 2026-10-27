export const slugPattern = '[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*';
export const codePattern = '[A-Za-z0-9][A-Za-z0-9_\\-]*';
export const skuPattern = '[A-Za-z0-9][A-Za-z0-9._\\-]{2,99}';
export const locationPattern = '[A-Za-z0-9][A-Za-z0-9_\\-]{1,63}';
export const pricePattern = '[0-9]{1,17}(?:\\.[0-9]{1,2})?';
export function formatAdminPrice(
  amount: string | number,
  currency: string,
): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));
  if (!match) return `${amount} ${currency}`;
  const fraction =
    match[2] && Number(match[2]) !== 0 ? `,${match[2].padEnd(2, '0')}` : '';
  return `${BigInt(match[1]).toLocaleString('vi-VN')}${fraction} ${currency === 'VND' ? '₫' : currency}`;
}
export function integerInput(value: string, signed = false): number {
  if (!(signed ? /^-?\d+$/ : /^\d+$/).test(value))
    throw new Error('Nhập số lượng nguyên hợp lệ.');
  const result = Number(value);
  if (!Number.isSafeInteger(result))
    throw new Error('Số lượng vượt giới hạn an toàn của giao diện.');
  if (signed && result === 0) throw new Error('Mức điều chỉnh phải khác 0.');
  return result;
}
export function validateImages(files: File[]): string | null {
  if (!files.length || files.length > 5) return 'Chọn từ 1 đến 5 ảnh mỗi lượt.';
  if (
    files.some(
      (file) =>
        !['image/png', 'image/jpeg'].includes(file.type) ||
        file.size <= 0 ||
        file.size > 5 * 1024 * 1024,
    )
  )
    return 'Ảnh cần là JPEG/PNG, tối đa 5 MB mỗi file. Server tiếp tục kiểm tra nội dung ảnh.';
  return null;
}
