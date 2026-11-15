import { Icon, type IconProps } from './icon';

export function CaptionsOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5.25" width="18" height="13.5" rx="2" />
      <path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6" />
      <path d="M17 10.2a2.2 2.2 0 1 0 0 3.6" />
    </Icon>
  );
}
