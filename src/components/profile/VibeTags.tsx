"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/context";

interface VibeTagsProps {
  label: string;
  tags: string[];
  onRemove?: (tag: string) => void;
  onAdd?: (tag: string) => void;
}

export function VibeTags({ label, tags, onRemove, onAdd }: VibeTagsProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleAdd = () => {
    if (newTag.trim() && onAdd) {
      onAdd(newTag.trim());
    }
    setNewTag("");
    setAdding(false);
  };

  return (
    <div>
      <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[1px] text-n-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-n-100 px-3.5 py-[6px] text-[13px] font-medium text-n-800"
          >
            {tag.toLowerCase()}
            {onRemove && (
              <button onClick={() => onRemove(tag)} className="text-n-400 opacity-60 hover:text-rose-400 hover:opacity-100 text-[12px]">
                &times;
              </button>
            )}
          </span>
        ))}
        {adding ? (
          <input
            ref={inputRef}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setNewTag(""); setAdding(false); }
            }}
            onBlur={handleAdd}
            className="rounded-full border-[1.5px] border-lavender-400/40 bg-n-0 px-3.5 py-[6px] text-[13px] font-medium text-n-800 outline-none focus:border-lavender-400 focus:ring-1 focus:ring-lavender-400/30"
            placeholder={t("tasteProfile.typeTag")}
          />
        ) : (
          onAdd && (
            <button
              onClick={() => setAdding(true)}
              className="rounded-full border border-dashed border-n-400 px-3.5 py-[6px] text-[13px] font-medium text-n-400 hover:border-n-500 hover:bg-n-100"
            >
              {t("tasteProfile.addTag")}
            </button>
          )
        )}
      </div>
    </div>
  );
}
