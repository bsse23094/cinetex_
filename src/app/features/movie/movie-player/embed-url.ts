/** URL format documented at https://vidsrc.sh/vidsrc/docs/. */
export function buildEmbedUrl(base: string, type: string, id: string | null, season = 1, episode = 1, resumeAt = 0): string | null {
  if (!base || !id || !/^(?:[1-9]\d*|tt\d+)$/.test(id)) return null;
  const series = type === 'tv' || type === 'anime';
  if (series && (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1)) return null;
  try {
    const origin = new URL(base);
    if (origin.protocol !== 'https:') return null;
    const url = new URL(series ? `/embed/tv/${id}/${season}/${episode}` : `/embed/movie/${id}`, origin);
    url.searchParams.set('autonext', '0');
    if (Number.isFinite(resumeAt) && resumeAt > 0) url.searchParams.set('startAt', String(Math.floor(resumeAt)));
    return url.href;
  } catch { return null; }
}
