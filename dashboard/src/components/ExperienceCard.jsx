import { TEMPLATES } from '../lib/constants'
import QRDisplay from './QRDisplay'

export default function ExperienceCard({ experience, onEdit, onDelete }) {
  const template = TEMPLATES.find(t => t.id === experience.template_id) || TEMPLATES[0]
  const arUrl = `${import.meta.env.VITE_AR_BASE_URL || 'https://ar.yourdomain.com'}/?pid=${experience.product_id}`

  return (
    <div className="exp-card">
      <div className="exp-card-preview" style={{ background: template.preview }}>
        <div className="exp-card-type-badge">
          {experience.experience_type === 'video' && '🎥'}
          {experience.experience_type === 'photo' && '🖼️'}
          {experience.experience_type === 'text' && '✨'}
          <span>{experience.experience_type || 'text'}</span>
        </div>
        <div className="exp-card-template-name">{template.name}</div>
      </div>

      <div className="exp-card-body">
        <h3 className="exp-card-title">{experience.title || 'Untitled Experience'}</h3>
        <p className="exp-card-meta">
          Updated {new Date(experience.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        {experience.cta_label && (
          <div className="exp-cta-preview">
            <span className="exp-cta-dot" />
            CTA: {experience.cta_label}
          </div>
        )}

        <div className="exp-qr-wrap">
          <QRDisplay url={arUrl} size={80} />
          <div className="exp-url-info">
            <p className="exp-url-label">AR Experience URL</p>
            <a href={arUrl} target="_blank" rel="noopener noreferrer" className="exp-url">
              {arUrl.replace('https://', '')}
            </a>
          </div>
        </div>

        <div className="exp-card-actions">
          <button className="exp-btn-edit" onClick={onEdit}>Edit Experience</button>
          <button className="exp-btn-delete" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <style>{`
        .exp-card {
          background: var(--surface-2);
          border-radius: var(--r-lg);
          border: 1px solid var(--border);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: all 0.25s;
        }
        .exp-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

        .exp-card-preview {
          height: 100px;
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: 10px 14px;
        }
        .exp-card-type-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(0,0,0,0.35);
          backdrop-filter: blur(8px);
          color: #fff;
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 500;
        }
        .exp-card-template-name {
          position: absolute;
          top: 10px;
          right: 14px;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          font-style: italic;
          font-family: var(--font-fine);
        }

        .exp-card-body { padding: 16px; }
        .exp-card-title { font-size: 16px; margin-bottom: 4px; }
        .exp-card-meta { font-size: 12px; color: var(--ink-3); margin-bottom: 10px; }

        .exp-cta-preview {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--ink-2);
          background: var(--gold-pale);
          border-radius: var(--r-sm);
          padding: 5px 10px;
          margin-bottom: 12px;
        }
        .exp-cta-dot {
          width: 6px; height: 6px;
          background: var(--gold);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .exp-qr-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface-3);
          border-radius: var(--r-md);
          padding: 12px;
          margin-bottom: 14px;
        }
        .exp-url-info { min-width: 0; }
        .exp-url-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.7px; color: var(--ink-3); margin-bottom: 3px; }
        .exp-url { font-size: 11px; color: var(--gold); word-break: break-all; display: block; }

        .exp-card-actions { display: flex; gap: 8px; }
        .exp-btn-edit {
          flex: 1;
          background: var(--ink);
          color: #fff;
          border: none;
          border-radius: var(--r-sm);
          padding: 9px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .exp-btn-edit:hover { background: var(--ink-2); }
        .exp-btn-delete {
          background: none;
          border: 1.5px solid var(--border-strong);
          border-radius: var(--r-sm);
          padding: 9px 14px;
          font-size: 13px;
          color: var(--rose);
          transition: all 0.2s;
        }
        .exp-btn-delete:hover { background: var(--rose-pale); border-color: var(--rose); }
      `}</style>
    </div>
  )
}
