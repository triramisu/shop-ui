import type { SVGProps } from 'react';

const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  'arrow-up': 'M6 18 18 6M6 6h12v12',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  search: 'm21 21-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
  bag: 'M5 7h14l1 14H4L5 7Zm3 1V6a4 4 0 0 1 8 0v2',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  headphones:
    'M3 14v-3a9 9 0 0 1 18 0v3M3 13h3v8H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm15 0h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3v-8Z',
  laptop: 'M4 3h16v13H4V3ZM2 20l2-4h16l2 4H2Zm7-1h6',
  phone:
    'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm3 3h4m-3 14h2',
  watch:
    'm9 2-1 5m8 0-1-5M9 22l-1-5m8 0-1 5M6 8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8Zm6 1v3l2 1',
  camera: 'M3 6h4l2-3h6l2 3h4v15H3V6Zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  speaker: 'M5 2h14v20H5V2Zm10 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3-9v1',
  sliders: 'M4 21v-7m0-6V3m8 18v-3m0-6V3m8 18V10m0-6V3M1 8h6m2 10h6m2-8h6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  menu: 'M3 6h18M3 12h18M3 18h18',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z',
  shield: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 10 3 3 5-6',
  box: 'm12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5m-9 5L3 7m9 5v10M7.5 4.5l9 5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  refresh: 'M20 7A9 9 0 0 0 5 5L2 8m0-5v5h5m-3 9a9 9 0 0 0 15 2l3-3m0 5v-5h-5',
  info: 'M12 11v6m0-10v1m10 4a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  logout: 'M9 3H3v18h6m7-14 5 5-5 5M8 12h13',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  mail: 'M3 4h18v16H3V4Zm0 1 9 8 9-8',
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function categoryIcon(name: string): IconName {
  const value = name.toLocaleLowerCase('vi');
  if (/tai nghe|âm thanh|audio|headphone/.test(value)) return 'headphones';
  if (/điện thoại|phone|tablet|máy tính bảng/.test(value)) return 'phone';
  if (/laptop|máy tính|bàn phím|keyboard/.test(value)) return 'laptop';
  if (/đồng hồ|watch/.test(value)) return 'watch';
  if (/máy ảnh|camera/.test(value)) return 'camera';
  if (/loa|speaker/.test(value)) return 'speaker';
  return 'box';
}
