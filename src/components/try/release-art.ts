/**
 * Each major release's hero artwork from its page on wordpress.org, served from
 * public/release-art/. An entry covers the release and its minor updates (7.1
 * covers 7.1.1, 7.1.2, …), so the welcome shows the art for whichever version the
 * Playground site runs. Versions without art get a welcome without an image.
 *
 * To add a release: save its hero image at full size (the panel crops it to fill,
 * so it needs about 1200px for retina screens) as public/release-art/<major>.jpg
 * and add an entry here with its dimensions.
 */
const releaseArt: Record<string, { src: string; width: number; height: number; source: string }> = {
  "7.1": {
    src: "/release-art/7.1.jpg",
    width: 1210,
    height: 1256,
    source: "https://wordpress.org/download/releases/7-1/",
  },
};

/** The artwork for a WordPress version ("7.1.2", "7.2-beta1"), if its major release has some. */
export function getReleaseArt(version: string | null) {
  const major = version?.match(/^\d+\.\d+/)?.[0];
  return major ? releaseArt[major] : undefined;
}
