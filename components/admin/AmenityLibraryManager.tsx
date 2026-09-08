'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface AmenityLibraryManagerProps {
  selectedInternal: string[];
  selectedExternal: string[];
  onChangeInternal: (items: string[]) => void;
  onChangeExternal: (items: string[]) => void;
}

const EMOJI_MAP: Record<string, string> = {
  gym: '💪', pool: '🏊', club: '🏠', security: '🛡️', power: '⚡',
  parking: '🚗', garden: '🌳', kids: '👶', jacuzzi: '🛁', yoga: '🧘',
  tennis: '🎾', cricket: '🏏', jogging: '🚴', automation: '🏠', door: '📹',
  motion: '🔒', skating: '🛹', basketball: '🏀', badminton: '🏸',
};

function guessEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '✨';
}

const EMOJI_OPTIONS = [
  '✨','💪','🏊','🏠','🛡️','⚡','🚗','🌳','👶','🛁','🧘',
  '🎾','🏏','🚴','📹','🔒','🛹','🏀','🏸','🎪','⛳','🎭',
  '🏋️','🧒','🎡','🌊','🏑','🔥','💧','🌿','🎯','🎲','🛗',
  '🏪','🍽️','☕','🎬','📚','🧹','🌞','❄️','🌀','🔑',
];

function TagInput({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('✨');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setSelectedEmoji(guessEmoji(input));
  }, [input]);

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Split on commas (and newlines, in case of paste) so a batch like
    // "Digital Lock, Video Door Panel, Vitrified Tiles" becomes multiple
    // separate values instead of one combined string.
    const parts = trimmed
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return;

    const existingNames = new Set(
      items.map((i) => {
        const sep = i.indexOf('::');
        return (sep !== -1 ? i.slice(sep + 2) : i).toLowerCase();
      })
    );

    const newEntries: string[] = [];
    for (const part of parts) {
      if (existingNames.has(part.toLowerCase())) continue;
      // If only one part (normal single-value add), respect the emoji the
      // user picked. For a multi-value batch, guess a fitting emoji per item.
      const emoji = parts.length === 1 ? selectedEmoji : guessEmoji(part);
      newEntries.push(`${emoji}::${part}`);
      existingNames.add(part.toLowerCase());
    }

    if (newEntries.length === 0) return;

    onChange([...items, ...newEntries]);
    setInput('');
    setSelectedEmoji('✨');
    setShowPicker(false);
  };

  const remove = (item: string) => onChange(items.filter((i) => i !== item));

  const parseItem = (item: string): { emoji: string; name: string } => {
    const sep = item.indexOf('::');
    if (sep !== -1) return { emoji: item.slice(0, sep), name: item.slice(sep + 2) };
    return { emoji: guessEmoji(item), name: item };
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const { emoji, name } = parseItem(item);
          return (
            <span
              key={item}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full text-xs font-medium text-[var(--text-secondary)]"
            >
              <span>{emoji}</span>
              {name}
              <button type="button" onClick={() => remove(item)} className="hover:text-[var(--danger)] ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex gap-2 items-center relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPicker(v => !v)}
            className="w-9 h-9 flex items-center justify-center bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-xs)] text-lg hover:border-[var(--primary)] transition-colors"
            title="Pick emoji"
          >
            {selectedEmoji}
          </button>
          {showPicker && (
            <div className="absolute bottom-11 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-lg p-2 w-56">
              <div className="flex flex-wrap gap-1">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setSelectedEmoji(e); setShowPicker(false); }}
                    className={`w-8 h-8 flex items-center justify-center rounded text-lg hover:bg-[var(--surface-raised)] transition-colors ${selectedEmoji === e ? 'bg-[var(--primary-glow)] ring-1 ring-[var(--primary)]' : ''}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') { e.preventDefault(); add(); }
            if (e.key === 'Escape') setShowPicker(false);
          }}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="flex-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-xs)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-2 bg-[var(--primary)] text-white rounded-[var(--radius-xs)] hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AmenityLibraryManager({
  selectedInternal,
  selectedExternal,
  onChangeInternal,
  onChangeExternal,
}: AmenityLibraryManagerProps) {
  return (
    <div className="space-y-6">
      <TagInput label="Internal Amenities" items={selectedInternal} onChange={onChangeInternal} />
      <TagInput label="External Amenities" items={selectedExternal} onChange={onChangeExternal} />
    </div>
  );
}
