import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 2v4M18 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
  </Icon>
);
export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);
export const BallIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 8 3-2 3 2-1 4h-4L9 8ZM10 12l-3 3M14 12l3 3M7.5 7.5 9 8M16.5 7.5 15 8M9 18l1-3M15 18l-1-3" />
  </Icon>
);
export const ChildIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5 22a7 7 0 0 1 14 0M9 6c1.5-1 4.5-1 6 0" />
  </Icon>
);
export const ChevronLeft = (props: IconProps) => (
  <Icon {...props}><path d="m15 18-6-6 6-6" /></Icon>
);
export const ChevronRight = (props: IconProps) => (
  <Icon {...props}><path d="m9 18 6-6-6-6" /></Icon>
);
export const PlusIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
);
export const CloseIcon = (props: IconProps) => (
  <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>
);
export const CarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 11 2-5h10l2 5M3 13a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3v-5ZM5 18v2M19 18v2M7 14h.01M17 14h.01" />
  </Icon>
);
export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v4M12 17h.01" />
  </Icon>
);
export const MailIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3 5h18v14H3zM3 6l9 7 9-7" /></Icon>
);
export const CheckIcon = (props: IconProps) => (
  <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>
);
export const EditIcon = (props: IconProps) => (
  <Icon {...props}><path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5 4 20ZM13.5 7l3.5 3.5" /></Icon>
);
export const TrashIcon = (props: IconProps) => (
  <Icon {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></Icon>
);
