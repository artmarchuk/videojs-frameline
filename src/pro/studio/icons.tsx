import { FillIcon, Icon, type IconProps } from '../../video/icons/icon';

// Studio icons. A trial set: Phosphor Icons in the Fill weight (MIT, see THIRD_PARTY_NOTICES.md), path data copied
// in, no runtime dependency. The two frame-step icons are our own outline drawings: Phosphor has no glyph of an
// arrow pointing away from a bar.

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

/** Previous cut: an arrow pointing into a bar. Phosphor `skip-back`, Fill. */
export const PreviousCutIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M208,47.88V208.12a16,16,0,0,1-24.43,13.43L64,146.77V216a8,8,0,0,1-16,0V40a8,8,0,0,1,16,0v69.23L183.57,34.45A15.95,15.95,0,0,1,208,47.88Z" />
  </FillIcon>
);

/** Next cut: an arrow pointing into a bar. Phosphor `skip-forward`, Fill. */
export const NextCutIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M208,40V216a8,8,0,0,1-16,0V146.77L72.43,221.55A15.95,15.95,0,0,1,48,208.12V47.88A15.95,15.95,0,0,1,72.43,34.45L192,109.23V40a8,8,0,0,1,16,0Z" />
  </FillIcon>
);

/** Phosphor `repeat`, Fill. */
export const LoopIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M24,128A72.08,72.08,0,0,1,96,56h96V40a8,8,0,0,1,13.66-5.66l24,24a8,8,0,0,1,0,11.32l-24,24A8,8,0,0,1,192,88V72H96a56.06,56.06,0,0,0-56,56,8,8,0,0,1-16,0Zm200-8a8,8,0,0,0-8,8,56.06,56.06,0,0,1-56,56H64V168a8,8,0,0,0-13.66-5.66l-24,24a8,8,0,0,0,0,11.32l24,24A8,8,0,0,0,64,216V200h96a72.08,72.08,0,0,0,72-72A8,8,0,0,0,224,120Z" />
  </FillIcon>
);

/** Phosphor `camera`, Fill. */
export const GrabFrameIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm-44,76a36,36,0,1,1-36-36A36,36,0,0,1,164,132Z" />
  </FillIcon>
);

/** Guides: the picture's frame with corner marks inside it. Phosphor `frame-corners`, Fill. */
export const GuidesIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM88,192H56a8,8,0,0,1-8-8V152a8,8,0,0,1,16,0v24H88a8,8,0,0,1,0,16Zm120-88a8,8,0,0,1-16,0V80H168a8,8,0,0,1,0-16h32a8,8,0,0,1,8,8Z" />
  </FillIcon>
);

/** Phosphor `bookmark-simple`, Fill. */
export const BookmarkIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z" />
  </FillIcon>
);

/** Link, for "Copy link at timecode". Phosphor `link`, Fill. */
export const LinkIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM115.7,192.49a43.31,43.31,0,0,1-55-66.43l25.37-25.37a43.35,43.35,0,0,1,61.25,0,42.9,42.9,0,0,1,9.95,15.43,8,8,0,1,1-15,5.6A27.33,27.33,0,0,0,97.37,112L72,137.37a27.32,27.32,0,0,0,34.68,41.91,8,8,0,1,1,9,13.21Zm79.61-62.55-25.37,25.37A43,43,0,0,1,139.32,168h0a43.35,43.35,0,0,1-40.53-28.12,8,8,0,1,1,15-5.6A27.35,27.35,0,0,0,139.28,152h0a27.14,27.14,0,0,0,19.32-8L184,118.63a27.32,27.32,0,0,0-34.68-41.91,8,8,0,1,1-9-13.21,43.32,43.32,0,0,1,55,66.43Z" />
  </FillIcon>
);
