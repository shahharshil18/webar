export const AR_BASE_URL = import.meta.env.VITE_AR_BASE_URL || 'https://ar.yourdomain.com'

export const TEMPLATES = [
  {
    id: 'golden',
    name: 'Golden Hour',
    description: 'Warm amber tones, luxury gift energy',
    preview: 'linear-gradient(135deg, #f0a500 0%, #e8527a 100%)',
    textColor: '#fff8e7',
    overlayColor: 'rgba(240,165,0,0.15)',
    fontFamily: '"Playfair Display", serif',
    animationStyle: 'float',
  },
  {
    id: 'midnight',
    name: 'Midnight Magic',
    description: 'Deep navy, silver stars, mystery',
    preview: 'linear-gradient(135deg, #0a0f1e 0%, #1a2744 100%)',
    textColor: '#c8d8ff',
    overlayColor: 'rgba(10,15,30,0.7)',
    fontFamily: '"Cormorant Garamond", serif',
    animationStyle: 'pulse',
  },
  {
    id: 'sakura',
    name: 'Sakura Bloom',
    description: 'Soft pink, organic shapes, joy',
    preview: 'linear-gradient(135deg, #ffd6e7 0%, #ffb3c6 100%)',
    textColor: '#4a1530',
    overlayColor: 'rgba(255,214,231,0.4)',
    fontFamily: '"DM Serif Display", serif',
    animationStyle: 'bloom',
  },
  {
    id: 'forest',
    name: 'Forest Ritual',
    description: 'Deep greens, earthy, grounded',
    preview: 'linear-gradient(135deg, #1a3a1a 0%, #2d5a27 100%)',
    textColor: '#c8f5c8',
    overlayColor: 'rgba(26,58,26,0.6)',
    fontFamily: '"Libre Baskerville", serif',
    animationStyle: 'drift',
  },
]

export const EXPERIENCE_TYPES = [
  { id: 'video', label: 'Video Message', icon: '🎥' },
  { id: 'photo', label: 'Photo / Slideshow', icon: '🖼️' },
  { id: 'text', label: '3D Text Message', icon: '✨' },
]
