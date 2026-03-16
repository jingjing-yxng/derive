import { claude, deepseek } from "./providers";

const GREATER_CHINA_REGIONS = [
  "china", "mainland china", "中国", "中国大陆",
  "hong kong", "hongkong", "香港",
  "macau", "macao", "澳门",
  "taiwan", "台湾", "台灣",
  "beijing", "北京", "shanghai", "上海",
  "guangzhou", "广州", "shenzhen", "深圳",
  "chengdu", "成都", "hangzhou", "杭州",
  "xi'an", "西安", "guilin", "桂林",
  "yunnan", "云南", "sichuan", "四川",
  "hainan", "海南", "tibet", "西藏",
  "xinjiang", "新疆", "guizhou", "贵州",
];

export function routeProvider(regions: string[]) {
  const normalized = regions.map((r) => r.toLowerCase().trim());
  const isGreaterChina = normalized.some((r) =>
    GREATER_CHINA_REGIONS.some((gc) => r.includes(gc) || gc.includes(r))
  );

  return {
    model: isGreaterChina ? deepseek : claude,
    provider: isGreaterChina ? "deepseek" as const : "claude" as const,
    modelName: isGreaterChina ? "deepseek-chat" : "claude-sonnet-4-20250514",
  };
}

/** Split regions into Greater China vs rest. isSplit=true when both sides have regions. */
export function splitRegions(regions: string[]): {
  gcRegions: string[];
  otherRegions: string[];
  isSplit: boolean;
} {
  const gcRegions: string[] = [];
  const otherRegions: string[] = [];
  for (const region of regions) {
    const normalized = region.toLowerCase().trim();
    const isGC = GREATER_CHINA_REGIONS.some((gc) => normalized.includes(gc) || gc.includes(normalized));
    if (isGC) gcRegions.push(region);
    else otherRegions.push(region);
  }
  return { gcRegions, otherRegions, isSplit: gcRegions.length > 0 && otherRegions.length > 0 };
}
