import React from "react";
import HeroName from "@/components/HeroName";
import { getStaffVisuals } from "@/lib/staff-roles";

/** Pseudo forum avec couleurs staff (Sage / Sentinelle / Gardien Suprême). */
export default function ForumAuthorName({ author, size = "sm", showIcon, className = "" }) {
  const staff = getStaffVisuals(author);
  return (
    <HeroName
      user={author}
      size={size}
      className={className}
      showIcon={showIcon ?? !!staff}
      nameColor={staff?.color || null}
    />
  );
}
