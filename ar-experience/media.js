// Starts downloading the experience's media the moment the record is known — long
// before the engine has loaded — so it is already buffered when the artwork is found.
// No three.js here on purpose: this module must stay tiny and import nothing heavy.

export function prefetchMedia(exp) {
  const type = exp.experience_type

  if (type === 'video' && exp.media_url) {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true            // required for autoplay; unmuted on found (see content.js)
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.disablePictureInPicture = true
    video.disableRemotePlayback = true
    video.preload = 'auto'
    video.src = exp.media_url
    // Kept in the DOM (invisible): some mobile browsers stop decoding detached videos.
    video.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none'
    document.body.appendChild(video)
    video.load()

    return {
      kind: 'video',
      video,
      // Call from inside a tap handler. Playing once during a user gesture lets the
      // element start later (when the artwork is found) with sound, on iOS and Chrome.
      unlock() {
        video.muted = true
        const p = video.play()
        if (p) p.then(() => { video.pause(); video.currentTime = 0 }).catch(() => {})
      },
      dispose() { video.pause(); video.removeAttribute('src'); video.load(); video.remove() },
    }
  }

  const photoUrl = exp.media_urls?.[0] || exp.media_url
  if (type === 'photo' && photoUrl) {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.src = photoUrl
    return {
      kind: 'photo',
      image,
      ready: image.decode().then(() => true, () => false),
      unlock() {},
      dispose() { image.src = '' },
    }
  }

  return { kind: 'text', unlock() {}, dispose() {} }
}
