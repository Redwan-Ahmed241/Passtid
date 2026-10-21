import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const rows = [
  { time: "09:00", q: 0, color: "#0b6b4c" },
  { time: "11:45", q: 2, color: "#8a5800" },
  { time: "14:30", q: 4, color: "#a3261b" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f4f2ec",
          padding: 72,
          justifyContent: "space-between",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#14161b", letterSpacing: -0.5 }}>{site.name}</div>
          <div style={{ display: "flex", fontSize: 68, lineHeight: 1.05, color: "#14161b", letterSpacing: -2 }}>
            Book a slot you can actually attend — and see how busy it is.
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#636a75", fontFamily: "monospace" }}>
            Swedish embassy appointments · London time
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignSelf: "center",
            width: 360,
            padding: 24,
            background: "#ffffff",
            borderRadius: 24,
            border: "1px solid #e0ddd4",
          }}
        >
          {rows.map((r, i) => (
            <div
              key={r.time}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 22px",
                borderRadius: 16,
                border: i === 0 ? "2px solid #1f45b5" : "1px solid #e0ddd4",
                background: i === 0 ? "#e7ecfa" : "#ffffff",
                fontFamily: "monospace",
              }}
            >
              <span style={{ fontSize: 34, color: "#14161b" }}>{r.time}</span>
              <span style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
                {[12, 16, 20, 24, 28].map((h, j) => (
                  <span
                    key={h}
                    style={{ width: 7, height: h, borderRadius: 2, background: j < r.q ? r.color : "#d8d4ca" }}
                  />
                ))}
                <span style={{ marginLeft: 12, fontSize: 28, color: r.color }}>{r.q}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
