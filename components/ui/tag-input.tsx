"use client";

import React, { useState, useRef, useEffect } from "react";

const SPECIALIZATION_SUGGESTIONS = [
  "Surgery", "Dermatology", "Cardiology", "Dentistry", "Oncology",
  "Ophthalmology", "Neurology", "Orthopedics", "Avian", "Exotic Animals",
  "Internal Medicine", "Emergency Care", "Radiology", "Anesthesiology",
  "Grooming", "Nutrition", "Behavioral Medicine", "Reproduction",
];

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  suggestions?: string[];
  placeholder?: string;
  required?: boolean;
}

export function TagInput({
  label,
  tags,
  onChange,
  disabled = false,
  suggestions = SPECIALIZATION_SUGGESTIONS,
  placeholder = "Type and press Enter...",
  required = false,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    if (disabled) return;
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const tagVariants = [
    "bg-primary/10 text-primary border-primary/20",
    "bg-accent text-accent-foreground border-border",
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  ];

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div
        className={`flex flex-wrap items-center gap-1.5 border border-border rounded-xl px-3 py-2 min-h-[42px] transition
        ${disabled ? "bg-muted" : "bg-card focus-within:ring-2 focus-within:ring-ring"}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border ${tagVariants[i % tagVariants.length]}`}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                className="hover:opacity-70 transition ml-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); setHighlightedIndex(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] text-sm text-foreground placeholder-muted-foreground outline-none bg-transparent py-0.5"
          />
        )}
      </div>

      {showSuggestions && !disabled && input && filteredSuggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className={`w-full text-left px-4 py-2.5 text-sm transition
                ${i === highlightedIndex ? "bg-accent text-accent-foreground" : "text-popover-foreground hover:bg-accent/50"}
                ${i === 0 ? "rounded-t-xl" : ""} ${i === filteredSuggestions.length - 1 ? "rounded-b-xl" : ""}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
