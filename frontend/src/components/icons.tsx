import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconLogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <g stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5v1.6" />
        <path d="M10.4 4.4 12 2l1.6 2.4" />
        <path d="M12 18.9v1.6" />
        <path d="M10.4 19.6 12 22l1.6-2.4" />
      </g>
      <polygon
        points="12.00,6.80 12.77,10.15 15.68,8.32 13.85,11.23 17.20,12.00 13.85,12.77 15.68,15.68 12.77,13.85 12.00,17.20 11.23,13.85 8.32,15.68 10.15,12.77 6.80,12.00 10.15,11.23 8.32,8.32 11.23,10.15"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 4 8l8 4.5 8-4.5-8-4.5Z" />
      <path d="M4 12l8 4.5 8-4.5" />
      <path d="M4 16l8 4.5 8-4.5" />
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconTicket(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 9a2 2 0 0 1 0-4H20.5v4a2 2 0 0 0 0 4v4H3.5v-4a2 2 0 0 0 0-4Z" />
      <path d="M14 5v14" strokeDasharray="1.6 2.2" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z" />
    </svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11.5 3.5H5A1.5 1.5 0 0 0 3.5 5v6.5a1.5 1.5 0 0 0 .44 1.06l9 9a1.5 1.5 0 0 0 2.12 0l6.5-6.5a1.5 1.5 0 0 0 0-2.12l-9-9a1.5 1.5 0 0 0-1.06-.44Z" />
      <circle cx="8" cy="8" r="1.25" />
    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="3.5" width="10" height="17" rx="1" />
      <rect x="14.5" y="9.5" width="5" height="11" rx="1" />
      <path d="M7.5 7h1M10.5 7h1M7.5 10.5h1M10.5 10.5h1M7.5 14h1M10.5 14h1" />
      <path d="M17 13v.01M17 16v.01" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.75 19c.7-3.1 3.2-5 6.25-5s5.55 1.9 6.25 5" />
      <path d="M15.5 5.2a3.25 3.25 0 0 1 0 6.1" />
      <path d="M17.5 14.3c2.35.5 4 2.1 4.5 4.7" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h3" />
      <path d="M15.5 16l4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  );
}

export function IconPaperclip(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17.5 8.5 9.9 16.1a3 3 0 0 1-4.24-4.24l8.49-8.49a2 2 0 0 1 2.83 2.83L8.8 14.37a1 1 0 0 1-1.42-1.42l6.36-6.36" />
    </svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.7 3.86 2.5 18a1.5 1.5 0 0 0 1.3 2.25h16.4a1.5 1.5 0 0 0 1.3-2.25L13.3 3.86a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.75h.01" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-5.1" />
    </svg>
  );
}

export function IconXCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
      <path d="M8 8.5h8M8 12h5" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 12.5h5l1.5 2.5h4l1.5-2.5h5" />
      <path d="M6 5.5h12l2.5 7v6a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18.5v-6l2.5-7Z" />
    </svg>
  );
}

export function IconLightbulb(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5a2.7 2.7 0 0 1 1.1-2.2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3.5h7l4 4v12.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3.5V8h4" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5v11.5" />
      <path d="M7.5 11 12 15.5 16.5 11" />
      <path d="M4.5 17v2.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V17" />
    </svg>
  );
}

export function IconMonitor(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M9 20.5h6" />
      <path d="M12 16.5v4" />
    </svg>
  );
}

export function IconKey(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7.5" cy="14.5" r="4" />
      <path d="M10.5 11.5 19 3" />
      <path d="M15.5 7 18 9.5" />
      <path d="M18.5 5.5 21 8" />
    </svg>
  );
}

export function IconWorkflow(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3.5" width="6" height="5" rx="1.2" />
      <rect x="15" y="3.5" width="6" height="5" rx="1.2" />
      <rect x="9" y="15.5" width="6" height="5" rx="1.2" />
      <path d="M6 8.5v3a2 2 0 0 0 2 2h1" />
      <path d="M18 8.5v3a2 2 0 0 1-2 2h-1" />
      <path d="M12 13.5v2" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconNewspaper(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 6.5A1.5 1.5 0 0 1 6 5h9.5a1.5 1.5 0 0 1 1.5 1.5V17a2 2 0 0 0 2 2M6 5a1.5 1.5 0 0 1 1.5 1.5V19a2 2 0 0 1-2 2h11" />
      <path d="M8 9h5M8 12h5M8 15h3" />
    </svg>
  );
}

export function IconSmile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 13.5c.7 1.3 1.9 2 3.5 2s2.8-.7 3.5-2" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.5 5.5l2.5 2.5M16 16l2.5 2.5M5.5 18.5 8 16M16 8l2.5-2.5" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 6.5 12 13l8-6.5" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7l.7 12a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4l.7-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
      <circle cx="12" cy="15" r="1.4" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5.5 4.5h3l1.3 4.2-2 1.5a12 12 0 0 0 5.7 5.7l1.5-2 4.2 1.3v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4 6.1a1.5 1.5 0 0 1 1.5-1.6Z" />
    </svg>
  );
}

export function IconIdCard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="1.8" />
      <circle cx="8" cy="12" r="2" />
      <path d="M5 16.5c.5-1.7 1.7-2.5 3-2.5s2.5.8 3 2.5" />
      <path d="M14 9.5h4.5M14 12.5h4.5M14 15.5h3" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.4M19.5 12a7.5 7.5 0 0 1-12.6 5.4" />
      <path d="M16.3 4.8v3.6h-3.6" />
      <path d="M7.7 19.2v-3.6h3.6" />
    </svg>
  );
}

export function IconRemote(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M9 20.5h6M12 16.5v4" />
      <path d="M9 10.2a4.2 4.2 0 0 1 6 0" />
      <path d="M10.6 11.8a2 2 0 0 1 2.8 0" />
      <circle cx="12" cy="13.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="4.5" rx="1" />
      <path d="M4.5 8.5v9a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-9" />
      <path d="M10 13h4" />
    </svg>
  );
}

export function IconWhatsApp(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
      <path d="M16.7 14.1c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.5.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s1 2.5 1.1 2.6c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.2 0-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}
