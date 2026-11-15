import { Icon, type IconProps } from './icon';

export function SpeedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 16.5a8 8 0 1 1 15 0" />
      <path d="M12 13.5l3.75-5" />
      <path d="M11.99 13.5h.02" />
    </Icon>
  );
}
