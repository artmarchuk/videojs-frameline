import { Icon, type IconProps } from './icon';

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6.75" y="5.25" width="3.5" height="13.5" rx="0.75" />
      <rect x="13.75" y="5.25" width="3.5" height="13.5" rx="0.75" />
    </Icon>
  );
}
