import { FillIcon, type IconProps } from './icon';

/** The settings menu's button, named "More". Phosphor `dots-three-outline`, Fill. */
export function SettingsIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M156,128a28,28,0,1,1-28-28A28,28,0,0,1,156,128ZM48,100a28,28,0,1,0,28,28A28,28,0,0,0,48,100Zm160,0a28,28,0,1,0,28,28A28,28,0,0,0,208,100Z" />
    </FillIcon>
  );
}
