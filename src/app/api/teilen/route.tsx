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
          background: "radial-gradient(circle at 50% 30%, #3a27c9 0%, #0f0c24 62%)",
          color: "#f5f5f5",
          padding: "120px 90px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#8c7ff6" }}>StayCheck</div>
        <div style={{ display: "flex", marginTop: 260, fontSize: 52, color: "#c9c2ff" }}>Mein Viertel in {stadt}</div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1, marginTop: 20 }}>{kiez}</div>
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 40, color: "#8c7ff6", fontWeight: 800 }}>
          <span style={{ fontSize: 300, lineHeight: 1 }}>{match}</span>
          <span style={{ fontSize: 140, lineHeight: 1.4 }}>%</span>
        </div>
        <div style={{ display: "flex", fontSize: 48, color: "#9a9aa0" }}>passt zu mir</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 70 }}>
          {tags.map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                background: "#2a1810",
                color: "#8c7ff6",
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
            background: "#5340f2",
            color: "#fff",
            fontSize: 52,
            fontWeight: 800,
            padding: "40px",
            borderRadius: 999,
          }}
        >
          Welches Viertel passt zu dir?
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
