import { Icon, type IconProps } from './icon';

export function KeyboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="6.25" width="19" height="11.5" rx="2" />
      <path d="M6.49 10.25h.02M9.99 10.25h.02M13.49 10.25h.02M16.99 10.25h.02M8 14h8" />
    </Icon>
  );
}
