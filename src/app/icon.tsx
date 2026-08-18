import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f5d50",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 14,
            height: 8,
            borderLeft: "3.5px solid #faf7f1",
            borderBottom: "3.5px solid #faf7f1",
            transform: "rotate(-45deg)",
            marginTop: -2,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
