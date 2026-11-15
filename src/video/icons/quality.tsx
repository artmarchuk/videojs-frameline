import { Icon, type IconProps } from './icon';

export function QualityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 18.5v-3M9.67 18.5v-6.5M14.33 18.5v-10M19 18.5v-13.5" />
    </Icon>
  );
}
