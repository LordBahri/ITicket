import { resolveAssetUrl } from "../../api/client";

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

interface AvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Avatar({ name, avatarUrl, size = "sm", className = "" }: AvatarProps) {
  const resolvedUrl = resolveAssetUrl(avatarUrl);
  const sizeClass = SIZE_CLASSES[size];

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name ?? "Avatar"}
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ${sizeClass} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
