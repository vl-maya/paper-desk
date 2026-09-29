/** Paper Desk mark: schedule (calendar), order (numbered list), record (note lines). */
export function AppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="7" fill="#fffcf5" />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="6.25"
        stroke="#e8dfd0"
        strokeWidth="1.5"
      />
      {/* Schedule — mini calendar */}
      <rect
        x="4.5"
        y="6"
        width="11"
        height="11.5"
        rx="1.5"
        stroke="#8b7355"
        strokeWidth="1.25"
      />
      <path
        d="M4.5 9.5h11"
        stroke="#8b7355"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M7.25 6v2M11.75 6v2"
        stroke="#8b7355"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <rect x="6" y="11" width="2.2" height="2.2" rx="0.4" fill="#e8dfd0" />
      <rect x="9.1" y="11" width="2.2" height="2.2" rx="0.4" fill="#e8dfd0" />
      <rect x="12.2" y="11" width="2.2" height="2.2" rx="0.4" fill="#8b7355" />
      <rect x="6" y="14.1" width="2.2" height="2.2" rx="0.4" fill="#e8dfd0" />
      <rect x="9.1" y="14.1" width="2.2" height="2.2" rx="0.4" fill="#e8dfd0" />
      {/* Order — numbered tasks */}
      <path
        d="M18.5 8.5h9"
        stroke="#3d3428"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <text
        x="18"
        y="9.25"
        fill="#8b7355"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="4.5"
        fontWeight="600"
      >
        1
      </text>
      <path
        d="M18.5 13h9"
        stroke="#3d3428"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <text
        x="18"
        y="13.75"
        fill="#8b7355"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="4.5"
        fontWeight="600"
      >
        2
      </text>
      <path
        d="M18.5 17.5h7"
        stroke="#3d3428"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <text
        x="18"
        y="18.25"
        fill="#8b7355"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="4.5"
        fontWeight="600"
      >
        3
      </text>
      {/* Record — note lines */}
      <path
        d="M6 22.5h20"
        stroke="#6b5f4f"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M6 25h16"
        stroke="#6b5f4f"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M6 27.5h18"
        stroke="#6b5f4f"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="5" cy="22.5" r="1" fill="#8b7355" />
    </svg>
  );
}
