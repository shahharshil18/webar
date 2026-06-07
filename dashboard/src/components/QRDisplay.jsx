import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRDisplay({ url, size = 120 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !url) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: size * 2,
      margin: 1,
      color: { dark: '#0d0d14', light: '#f8f6f2' },
      errorCorrectionLevel: 'M',
    })
  }, [url, size])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'ar-gift-qr.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="qr-wrap" onClick={handleDownload} title="Click to download QR code">
      <canvas ref={canvasRef} style={{ width: size, height: size, borderRadius: 6, cursor: 'pointer' }} />
      <style>{`
        .qr-wrap { display: inline-block; line-height: 0; border-radius: 8px; overflow: hidden; }
        .qr-wrap:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}
