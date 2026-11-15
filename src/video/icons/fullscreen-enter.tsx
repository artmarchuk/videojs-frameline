import { Icon, type IconProps } from './icon';

export function FullscreenEnterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 9V5.5a1 1 0 0 1 1-1H9" />
      <path d="M15 4.5h3.5a1 1 0 0 1 1 1V9" />
      <path d="M19.5 15v3.5a1 1 0 0 1-1 1H15" />
      <path d="M9 19.5H5.5a1 1 0 0 1-1-1V15" />
    </Icon>
  );
}
