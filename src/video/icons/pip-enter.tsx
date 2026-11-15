import { Icon, type IconProps } from './icon';

export function PipEnterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="11.5" y="11.5" width="6.5" height="4.5" rx="0.75" />
    </Icon>
  );
}
