import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a3a0e 0%, #0c1118 100%)",
          borderRadius: 36,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="140" height="140">
          <defs>
            <linearGradient id="p" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9bd45c" />
              <stop offset="100%" stopColor="#6ab04c" />
            </linearGradient>
            <radialGradient id="b" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#fff3a8" />
              <stop offset="100%" stopColor="#f9ca24" />
            </radialGradient>
          </defs>
          <g transform="rotate(-22 16 16)">
            <rect x="7.5" y="3" width="14" height="18" rx="6" fill="url(#p)" />
            <rect
              x="7.5"
              y="3"
              width="14"
              height="18"
              rx="6"
              fill="none"
              stroke="#3f7a2d"
              strokeOpacity="0.5"
              strokeWidth="0.9"
            />
            <rect x="12.5" y="20" width="4" height="9" rx="1.6" fill="#3f7a2d" />
            <rect x="11.5" y="19" width="6" height="3" rx="1" fill="#3f7a2d" opacity="0.85" />
          </g>
          <circle cx="24" cy="8.5" r="4.5" fill="url(#b)" />
          <circle cx="22.5" cy="7.5" r="0.55" fill="#000" fillOpacity="0.4" />
          <circle cx="25.5" cy="9.5" r="0.55" fill="#000" fillOpacity="0.4" />
          <circle cx="22.8" cy="10" r="0.55" fill="#000" fillOpacity="0.4" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
