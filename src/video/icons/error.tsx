import { Icon, type IconProps } from './icon';

export function ErrorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.25l8.75 15h-17.5z" />
      <path d="M12 10v4.25" />
      <path d="M11.99 16.75h.02" />
    </Icon>
  );
}
