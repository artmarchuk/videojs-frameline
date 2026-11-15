import { Icon, type IconProps } from './icon';

export function VolumeMutedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5h3l4.5-3.75v12.5L7 14.5H4z" />
      <path d="M15.25 9.5l5 5m0-5l-5 5" />
    </Icon>
  );
}
