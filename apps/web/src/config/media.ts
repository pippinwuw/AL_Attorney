/** 静态资源根路径（由 Vite 插件映射到仓库 material/） */
const material = '/material';

function assetPath(...segments: string[]): string {
  return `${material}/${segments.map((s) => encodeURIComponent(s)).join('/')}`;
}

export const BGM = {
  title: assetPath('music', 'Title Screen(Av955216805,P1).mp3'),
  investigation: assetPath('music', 'Courtroom Lounge ~ Beginning Prel(Av955216805,P3).mp3'),
  trial: assetPath('music', 'Ace Attorney-Trial(Av955216805,P4).mp3'),
} as const;

export type BgmTrack = (typeof BGM)[keyof typeof BGM];

export const IMAGES = {
  backgroundTrial: assetPath('picture', 'background_trial.webp'),
  objectionSuccess: assetPath('picture', 'OIP-C.webp'),
} as const;

/** portrait id → material/figure 文件名（不含扩展名） */
export const FIGURE_FILES: Record<string, string> = {
  naruhodo: 'defenseAttorney',
  prosecutor: 'prosecutor',
};

export function getFigureUrl(characterId?: string): string | undefined {
  if (!characterId) return undefined;
  const file = FIGURE_FILES[characterId];
  if (!file) return undefined;
  return assetPath('figure', `${file}.webp`);
}
