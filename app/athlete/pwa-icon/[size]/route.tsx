import { ImageResponse } from "next/og";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!["192", "512"].includes(size))
    return new Response(null, { status: 404 });
  const px = Number(size);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#080a0b",
        color: "#f5f6f7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: px * 0.22,
        fontWeight: 700,
        letterSpacing: -px * 0.009,
      }}
    >
      <span>MD</span>
      <span style={{ fontSize: px * 0.15, color: "#f47735" }}>NATION</span>
    </div>,
    { width: px, height: px },
  );
}
