const ICONS = {
  dashboard: "M3 11l9-8 9 8M5 10v10h14V10",
  bag: "M6 7h12l1 14H5L6 7ZM9 7V5a3 3 0 0 1 6 0v2",
  users: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5M18.5 19a5 5 0 0 0-3-4.6",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4L15 12l-3-3 2.7-2.7Z",
  plus: "M12 5v14M5 12h14",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z",
  shop: "M3 9l2-5h14l2 5M3 9v11h18V9M8 20v-6h8v6",
  ticket: "M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V8Z",
  idcard: "M4 6h16v12H4zM8 10h4M8 14h8M16 11a1 1 0 1 0 0-2",
  pin: "M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",
  building: "M4 21V7l8-4 8 4v14M9 21v-6h6v6",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7z",
  shield: "M12 3l8 4v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z",
  file: "M6 2h8l4 4v16H6zM14 2v4h4",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  help: "M9 9a3 3 0 1 1 4 2.8c-.8.4-1 1.2-1 2V15M12 19h.01",
  megaphone: "M3 11v2a4 4 0 0 0 4 4h1l2 4h2l-1.5-4H14l7-6-7-6H5a2 2 0 0 0-2 2Z",
  star: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.9 1-5.8L3.5 9.2l5.9-.9z",
  chart: "M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-8",
  headset: "M4 13a8 8 0 0 1 16 0M4 13v6h4v-6M20 13v6h-4v-6",
  phone: "M6 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C9 21 3 15 3 6a2 2 0 0 1 2-3Z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
  bug: "M8 7V3M16 7V3M4 13h16M7 9a5 5 0 0 1 10 0v8a5 5 0 0 1-10 0V9ZM5 8l2 2M19 8l-2 2M5 18l2-2M19 18l-2-2",
  userx: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a5.5 5.5 0 0 1 11 0M16 10l5 5M21 10l-5 5",
  flag: "M5 21V4h9l-1 4 1 4H5",
  chev: "m6 9 6 6 6-6",
  chevLeft: "m15 18-6-6 6-6",
  search: "M11 11a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-3.5-3.5",
  logout: "M14 4h6v6M20 4l-8 8M10 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5",
  drop: "M12 2c3 3 5 5.5 5 9a5 5 0 1 1-10 0c0-3.5 2-6 5-9Z",
};

export default function DsIcon({ name, size = 20 }) {
  const d = ICONS[name] || ICONS.grid;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {name === "search" ? (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      ) : name === "drop" ? (
        <>
          <path d={d} />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
        </>
      ) : (
        <path d={d} />
      )}
    </svg>
  );
}
