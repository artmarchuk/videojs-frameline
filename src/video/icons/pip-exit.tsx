import { Icon, type IconProps } from './icon';

export function PipExitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M15 14.5L8.5 9.5" />
      <path d="M8.5 13V9.5h3.5" />
    </Icon>
  );
}
