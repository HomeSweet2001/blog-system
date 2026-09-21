import { COLOR_PRESETS } from '../../lib/theme.js';

/** Campo de cor com paleta + entrada hexadecimal + presets rapidos. */
export default function ColorField({ label, value, onChange, showPresets = false }) {
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex items-center gap-2">
        <label
          className="relative h-10 w-14 shrink-0 cursor-pointer overflow-hidden rounded-theme border"
          style={{ borderColor: 'var(--c-border)' }}
        >
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          className="input font-mono uppercase"
          value={value || ''}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {showPresets && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.name}
              onClick={() => onChange(preset.colors)}
              className="h-6 w-6 rounded-full border transition hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${preset.colors.primary_color} 50%, ${preset.colors.accent_color} 50%)`,
                borderColor: 'var(--c-border)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
