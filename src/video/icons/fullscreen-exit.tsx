import { Icon, type IconProps } from './icon';

export function FullscreenExitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4.5V8a1 1 0 0 1-1 1H4.5" />
      <path d="M19.5 9H16a1 1 0 0 1-1-1V4.5" />
      <path d="M15 19.5V16a1 1 0 0 1 1-1h3.5" />
      <path d="M4.5 15H8a1 1 0 0 1 1 1v3.5" />
    </Icon>
  );
}
