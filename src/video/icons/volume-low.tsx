import { Icon, type IconProps } from './icon';

export function VolumeLowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5h3l4.5-3.75v12.5L7 14.5H4z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
    </Icon>
  );
}
