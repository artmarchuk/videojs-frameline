import { Icon, type IconProps } from './icon';

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="6.25" />
      <circle cx="12" cy="12" r="2.25" />
      <path d="M12 2.75v3M12 18.25v3M2.75 12h3M18.25 12h3M5.46 5.46l2.12 2.12M16.42 16.42l2.12 2.12M5.46 18.54l2.12-2.12M16.42 7.58l2.12-2.12" />
    </Icon>
  );
}
