import { OG_ALT, OG_SIZE, OG_TYPE, renderShareImage } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function TwitterImage() {
  return renderShareImage();
}
