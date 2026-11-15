import { Icon, type IconProps } from './icon';

export function SpinnerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" opacity="0.25" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" />
    </Icon>
  );
}
