import { ImageResponse } from "next/og";
import { LOGO_ASPECT, LOGO_DATA_URI } from "@/lib/logo-data";
import { site } from "@/lib/site";

/** The picture shown when a link to the site is shared (WhatsApp, Telegram, Slack, X, search results). */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_ALT = `${site.name}: ${site.tagline}`;
export const OG_TYPE = "image/png";

const LOGO_WIDTH = 760;

export function renderShareImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={LOGO_WIDTH} height={Math.round(LOGO_WIDTH / LOGO_ASPECT)} alt="" />
        <div style={{ display: "flex", marginTop: 52, fontSize: 46, fontWeight: 700, color: "#0a0a0a" }}>
          {site.tagline}
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 28, color: "#4b5563" }}>
          Swedish embassy appointments · London
        </div>
        {/* Swedish blue and yellow along the bottom edge */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 10, background: "#fecc02" }} />
          <div style={{ height: 26, background: "#006aa7" }} />
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
