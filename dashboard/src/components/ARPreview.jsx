export default function ARPreview({ form, template }) {
  return (
    <div className="ar-preview-shell">
      <div className="ar-preview-phone">
        <div className="ar-preview-notch" />
        <div className="ar-preview-screen" style={{ background: template.overlayColor || 'rgba(10,15,30,0.85)' }}>
          {/* Simulated camera feed */}
          <div className="ar-preview-camera">
            <div className="ar-preview-scanlines" />
            <div className="ar-preview-marker">
              <div className="ar-marker-corner ar-mc-tl" />
              <div className="ar-marker-corner ar-mc-tr" />
              <div className="ar-marker-corner ar-mc-bl" />
              <div className="ar-marker-corner ar-mc-br" />
              <div className="ar-marker-inner">
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>marker</span>
              </div>
            </div>

            {/* AR Content floating above marker */}
            <div className="ar-content-float">
              {form.experience_type === 'video' && (
                <div className="ar-content-video">
                  <div className="ar-video-thumb">
                    {form.media_url
                      ? <video src={form.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                      : <span style={{ fontSize: 24 }}>🎥</span>
                    }
                  </div>
                  <div className="ar-play-btn">▶</div>
                </div>
              )}
              {form.experience_type === 'photo' && (
                <div className="ar-content-photo">
                  {form.media_url
                    ? <img src={form.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    : <span style={{ fontSize: 24 }}>🖼️</span>
                  }
                </div>
              )}
              {form.experience_type === 'text' && (
                <div className="ar-content-text" style={{
                  fontFamily: template.fontFamily,
                  color: template.textColor,
                  textShadow: `0 0 20px ${template.textColor}`,
                }}>
                  {form.text_message || 'Your message appears here…'}
                </div>
              )}
            </div>
          </div>

          {/* CTA overlay */}
          {form.cta_label && (
            <div className="ar-cta-layer">
              <button className="ar-cta-btn" style={{ background: template.preview }}>
                {form.cta_label}
              </button>
            </div>
          )}

          {/* Bottom controls */}
          <div className="ar-bottom-controls">
            <button className="ar-ctrl-btn">↺ Replay</button>
            <button className="ar-ctrl-btn">⇧ Share</button>
          </div>
        </div>
        <div className="ar-preview-home-bar" />
      </div>

      <p className="ar-preview-hint">This is how your experience looks on a receiver's phone</p>

      <style>{`
        .ar-preview-shell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .ar-preview-phone {
          width: 220px;
          background: #111;
          border-radius: 36px;
          border: 8px solid #222;
          box-shadow: 0 0 0 1px #333, 0 24px 60px rgba(0,0,0,0.5), inset 0 0 0 1px #444;
          overflow: hidden;
          position: relative;
        }
        .ar-preview-notch {
          height: 28px;
          background: #111;
          border-radius: 0 0 16px 16px;
          width: 80px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }
        .ar-preview-screen {
          height: 400px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .ar-preview-home-bar {
          height: 24px;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ar-preview-home-bar::after {
          content: '';
          width: 60px; height: 4px;
          background: #444;
          border-radius: 2px;
        }

        .ar-preview-camera {
          flex: 1;
          position: relative;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0,200,100,0.03) 3px,
              rgba(0,200,100,0.03) 4px
            ),
            linear-gradient(180deg, #0a1a10 0%, #0d1f15 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ar-preview-scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            180deg,
            rgba(0,255,100,0.02) 0px,
            rgba(0,255,100,0.02) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
        }

        .ar-preview-marker {
          width: 80px; height: 80px;
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
        }
        .ar-marker-corner {
          position: absolute;
          width: 16px; height: 16px;
          border-color: rgba(0,255,100,0.7);
          border-style: solid;
        }
        .ar-mc-tl { top: 0; left: 0; border-width: 2px 0 0 2px; }
        .ar-mc-tr { top: 0; right: 0; border-width: 2px 2px 0 0; }
        .ar-mc-bl { bottom: 0; left: 0; border-width: 0 0 2px 2px; }
        .ar-mc-br { bottom: 0; right: 0; border-width: 0 2px 2px 0; }
        .ar-marker-inner {
          position: absolute; inset: 4px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,255,100,0.05);
        }

        .ar-content-float {
          position: absolute;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }

        .ar-content-video {
          width: 120px; height: 80px;
          background: rgba(0,0,0,0.5);
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .ar-play-btn {
          position: absolute;
          color: #fff;
          font-size: 18px;
          background: rgba(0,0,0,0.5);
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .ar-content-photo {
          width: 120px; height: 80px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .ar-content-text {
          text-align: center;
          font-size: 11px;
          line-height: 1.4;
          font-style: italic;
          padding: 6px;
          max-height: 80px;
          overflow: hidden;
          animation: glow 2s ease-in-out infinite;
        }
        @keyframes glow {
          0%,100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }

        .ar-cta-layer {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
        }
        .ar-cta-btn {
          background: linear-gradient(135deg, var(--gold), #e8a830);
          color: #fff;
          border: none;
          border-radius: 20px;
          padding: 7px 16px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: default;
          font-family: var(--font-body);
        }

        .ar-bottom-controls {
          position: absolute;
          bottom: 8px;
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 12px;
        }
        .ar-ctrl-btn {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.8);
          border-radius: 16px;
          padding: 4px 12px;
          font-size: 9px;
          cursor: default;
          font-family: var(--font-body);
        }

        .ar-preview-hint { font-size: 11px; color: var(--ink-3); text-align: center; max-width: 200px; }
      `}</style>
    </div>
  )
}
