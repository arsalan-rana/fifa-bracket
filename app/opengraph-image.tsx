import { ImageResponse } from 'next/og';

export const alt = 'FIFA World Cup 2026 Bracket Predictor';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #001240 0%, #003DA5 50%, #001240 100%)',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Gold top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(90deg, #C9A73A, #F0D060, #C9A73A)' }} />

      <div style={{ fontSize: 110, marginBottom: 24 }}>🏆</div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#C9A73A',
          letterSpacing: '-1px',
          marginBottom: 12,
        }}
      >
        FIFA World Cup 2026
      </div>

      <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.85)', marginBottom: 32 }}>
        🇺🇸 USA · 🇨🇦 Canada · 🇲🇽 Mexico &nbsp;|&nbsp; June 11 – July 19
      </div>

      <div
        style={{
          display: 'flex',
          gap: 24,
          fontSize: 26,
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        <span>Predict every match</span>
        <span>·</span>
        <span>Use chips</span>
        <span>·</span>
        <span>Climb the leaderboard</span>
      </div>

      {/* Gold bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(90deg, #C9A73A, #F0D060, #C9A73A)' }} />
    </div>,
    { ...size }
  );
}
