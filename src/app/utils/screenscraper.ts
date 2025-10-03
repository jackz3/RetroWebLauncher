type ScreenScraperCreds = {
  devid: string;
  devpassword: string;
  softname: string;
  ssid: string;         // 用户ID
  sspassword: string;   // 用户密码
};

type RomHash = {
  crc?: string;
  md5?: string;
  sha1?: string;
  size?: number;
};

function buildQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) q.set(k, String(v));
  });
  return q.toString();
}

// 通过校验和获取游戏信息（含 medias）
export async function getGameInfosByRom(
  creds: ScreenScraperCreds,
  systemeid: number, // 平台ID（如：Nintendo NES = 3，示例，实际以官方列表为准）
  rom: RomHash
) {
  const query = buildQuery({
    devid: creds.devid,
    devpassword: creds.devpassword,
    softname: creds.softname,
    ssid: creds.ssid,
    sspassword: creds.sspassword,
    output: 'json',
    romtype: 'rom',
    systemeid,
    crc: rom.crc,
    md5: rom.md5,
    sha1: rom.sha1,
    size: rom.size
  });

  const url = `https://api.screenscraper.fr/api2/jeuInfos.php?${query}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ScreenScraper error: ${res.status}`);
  const data = await res.json();
  return data;
}

// 从 medias 中挑选 screenshot URL（可根据区域/分辨率偏好）
export function pickScreenshotUrl(data: any, opts?: { regionPref?: string[] }) {
  const regionPref = opts?.regionPref ?? ['us', 'eu', 'wor', 'jp'];

  const medias = data?.response?.jeux?.[0]?.medias ?? data?.response?.jeu?.medias ?? [];
  if (!Array.isArray(medias)) return undefined;

  const screenshots = medias.filter((m: any) => {
    const t = (m?.type || '').toLowerCase();
    return t === 'screenshot' || t === 'ss';
  });

  if (screenshots.length === 0) return undefined;

  // 根据区域优先级选择
  screenshots.sort((a: any, b: any) => {
    const ra = regionPref.indexOf((a?.region || '').toLowerCase());
    const rb = regionPref.indexOf((b?.region || '').toLowerCase());
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  // 优先高清/原图链接，其次缩略图
  const first = screenshots[0];
  return first?.url || first?.url_high || first?.url_default || first?.url_thumb;
}

// 组合：拿到 screenshot 直链
export async function getScreenshotUrl(
  creds: ScreenScraperCreds,
  systemeid: number,
  rom: RomHash
) {
  const info = await getGameInfosByRom(creds, systemeid, rom);
  const url = pickScreenshotUrl(info);
  if (!url) throw new Error('No screenshot found');
  return url;
}