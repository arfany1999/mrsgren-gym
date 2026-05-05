"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { haptic } from "@/lib/haptics";
import styles from "./AvatarUpload.module.css";

interface AvatarUploadProps {
  size?: number;
  onUploaded?: (url: string) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB upload cap — Storage default policies can be raised in dashboard
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

export function AvatarUpload({ size = 96, onUploaded }: AvatarUploadProps) {
  const { supabase, user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cache-bust the rendered URL after a fresh upload so the browser doesn't
  // serve the previous photo from disk cache.
  const [bust, setBust] = useState(0);

  const displayName = profile?.name || user?.user_metadata?.name as string | undefined || user?.email?.split("@")[0] || "Athlete";
  const renderedSrc = profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes("?") ? "&" : "?"}v=${bust}` : null;

  function pick() {
    haptic("light");
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file again re-fires
    if (!file || !user) return;

    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("Please pick a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large — pick one under 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) {
        setError(upErr.message || "Upload failed.");
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        setError("Could not resolve the uploaded image URL.");
        return;
      }

      const { error: profErr } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (profErr) {
        setError(profErr.message || "Failed to save avatar to profile.");
        return;
      }

      haptic("success");
      setBust((b) => b + 1);
      onUploaded?.(publicUrl);
      // Re-fetch profile so the rest of the app (dashboard greeting,
      // top bar, etc.) picks up the new avatar without a reload.
      await refreshProfile?.();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.target}
        onClick={pick}
        disabled={uploading}
        aria-label="Change profile photo"
      >
        <Avatar
          name={displayName}
          email={user?.email ?? profile?.email}
          src={renderedSrc}
          size={size}
        />
        <span className={styles.cameraBadge} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        className={styles.fileInput}
        onChange={handleFile}
        aria-hidden
      />

      {uploading && <p className={styles.status}>Uploading…</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
