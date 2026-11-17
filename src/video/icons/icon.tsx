import type { ReactNode, SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

/**
 * Frame for our own outline drawings (the frame-step icons and the spinner): 24×24 grid, 1.5px stroke, round caps
 * and joins, `currentColor`. It has no fixed size; the control that holds it sets width and height. Icons are
 * decorative, so the SVG is `aria-hidden` and the button carries the accessible name.
 */
export function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * Frame for the solid icons, which are Phosphor Icons (MIT, see THIRD_PARTY_NOTICES.md): Phosphor's 256×256 grid,
 * filled with `currentColor`, no stroke. Like `Icon`, it has no fixed size and is decorative.
 */
export function FillIcon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}
