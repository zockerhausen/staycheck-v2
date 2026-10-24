import { ImageResponse } from "next/og";
import { rateLimit, tooMany } from "@/lib/ratelimit";

// Erzeugt das Teilen-Bild (1080 × 1920, Story-Format)
export async function GET(request: Request) {
  if (!rateLimit(request, "teilen", 20)) return tooMany();
  const { searchParams } = new URL(request.url);
  const kiez = (searchParams.get("kiez") ?? "Berlin").slice(0, 40);
  const match = Math.min(100, Math.max(0, Number(searchParams.get("match")) || 0));
  const stadt = (searchParams.get("stadt") ?? "Berlin").slice(0, 30);
  const tags = (searchParams.get("tags") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 3)
    .map((t) => t.slice(0, 20));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fbf3e4",
          color: "#2a1a10",
          padding: "120px 90px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#f2662f" }}>StayCheck</div>
        <div style={{ display: "flex", marginTop: 260, fontSize: 52, color: "#8a3510" }}>Mein Kiez in {stadt}</div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1, marginTop: 20 }}>{kiez}</div>
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 40, color: "#f2662f", fontWeight: 800 }}>
          <span style={{ fontSize: 300, lineHeight: 1 }}>{match}</span>
          <span style={{ fontSize: 140, lineHeight: 1.4 }}>%</span>
        </div>
        <div style={{ display: "flex", fontSize: 48, color: "#7a5f4c" }}>passt zu mir</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 70 }}>
          {tags.map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                background: "#ffe2cc",
                color: "#8a3510",
                fontSize: 46,
                fontWeight: 700,
                padding: "18px 40px",
                borderRadius: 999,
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexGrow: 1 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            background: "#f2662f",
            color: "#fff",
            fontSize: 52,
            fontWeight: 800,
            padding: "40px",
            borderRadius: 48,
            borderBottom: "14px solid #b8461b",
          }}
        >
          Welcher Kiez passt zu dir?
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
