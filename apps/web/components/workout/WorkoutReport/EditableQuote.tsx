"use client";

import { useState } from "react";
import styles from "./WorkoutReport.module.css";

interface EditableQuoteProps {
  text: string;
  author: string;
  onChangeText: (v: string) => void;
  onChangeAuthor: (v: string) => void;
}

/**
 * Quote card on the workout-report screen. Single-tap to edit, both fields
 * become controlled inputs; tap "Done" to commit. Lifting the state up to
 * the report keeps the quote rotation logic in one place.
 */
export function EditableQuote({ text, author, onChangeText, onChangeAuthor }: EditableQuoteProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      className={`${styles.quoteSection} ${editing ? styles.quoteEditing : ""}`}
      onClick={() => !editing && setEditing(true)}
    >
      {!editing && <span className={styles.quoteEditBadge}>EDIT</span>}
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <p className={styles.quoteEditTitle}>EDIT QUOTE</p>
          <textarea
            className={styles.quoteTextarea}
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            autoFocus
            rows={3}
          />
          <input
            className={styles.quoteInput}
            value={author}
            onChange={(e) => onChangeAuthor(e.target.value)}
            placeholder="Author"
          />
          <button
            className={styles.quoteDoneBtn}
            type="button"
            onClick={() => setEditing(false)}
          >
            DONE ✓
          </button>
        </div>
      ) : (
        <>
          <p className={styles.quoteText}>&ldquo;{text}&rdquo;</p>
          <p className={styles.quoteAuthor}>— {author}</p>
        </>
      )}
    </div>
  );
}
