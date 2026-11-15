import { Icon, type IconProps } from '../../video/icons/icon';

// Review icons, drawn in the same family as the Share set: 24 grid, 1.5 stroke, round caps and joins.

export const StepBackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M17 6.5v11L8.5 12z" />
    <path d="M6 6.5v11" />
  </Icon>
);

export const StepForwardIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 6.5v11l8.5-5.5z" />
    <path d="M18 6.5v11" />
  </Icon>
);

export const PreviousCutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 7l-5 5 5 5" />
    <path d="M18.5 7l-5 5 5 5" />
    <path d="M4.5 6.5v11" />
  </Icon>
);

export const NextCutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 7l5 5-5 5" />
    <path d="M5.5 7l5 5-5 5" />
    <path d="M19.5 6.5v11" />
  </Icon>
);

export const MarkInIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 4.5H6.5v15H10" />
    <path d="M11.5 12h7" />
  </Icon>
);

export const MarkOutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4.5h3.5v15H14" />
    <path d="M5.5 12h7" />
  </Icon>
);

export const LoopIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M17 3.5l3 3-3 3" />
    <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
    <path d="M7 20.5l-3-3 3-3" />
    <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
  </Icon>
);

export const PlayRangeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.5 5h-2v14h2" />
    <path d="M17.5 5h2v14h-2" />
    <path d="M9.75 8.5v7l5.75-3.5z" />
  </Icon>
);

export const ClearRangeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.5 5h-2v14h2" />
    <path d="M17.5 5h2v14h-2" />
    <path d="M9.5 9.5l5 5m0-5l-5 5" />
  </Icon>
);

export const GrabFrameIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="6.5" width="17" height="12.5" rx="2" />
    <circle cx="12" cy="12.75" r="3" />
    <path d="M8.5 6.5l1-2h5l1 2" />
  </Icon>
);

export const CopyImageIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 5.34l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1" />
  </Icon>
);

export const PosterIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M3.5 15.5l4.5-4 4 3.5 3-2.5 5.5 4.5" />
    <circle cx="15.5" cy="9.25" r="1.25" />
  </Icon>
);

export const MoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="5.5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18.5" cy="12" r="1" />
  </Icon>
);
