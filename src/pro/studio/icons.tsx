import { Icon, type IconProps } from '../../video/icons/icon';

// Studio icons, drawn in the same family as the Viewer set: 24 grid, 1.5 stroke, round caps and joins.

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

export const LoopIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M17 3.5l3 3-3 3" />
    <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
    <path d="M7 20.5l-3-3 3-3" />
    <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
  </Icon>
);

export const GrabFrameIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="6.5" width="17" height="12.5" rx="2" />
    <circle cx="12" cy="12.75" r="3" />
    <path d="M8.5 6.5l1-2h5l1 2" />
  </Icon>
);

export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.75" />
  </Icon>
);

export const BookmarkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 4.5h10a.5.5 0 0 1 .5.5v14.5L12 15.75 6.5 19.5V5a.5.5 0 0 1 .5-.5z" />
  </Icon>
);
