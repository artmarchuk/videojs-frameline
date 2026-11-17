import { FillIcon, Icon, type IconProps } from '../../video/icons/icon';

// Studio icons. A trial set: Phosphor Icons in the Fill weight (MIT, see THIRD_PARTY_NOTICES.md), path data copied
// in, no runtime dependency. The link icon is our own outline drawing.

/** Step back one frame: an arrow pointing into a bar. Phosphor `skip-back`, Fill. */
export const StepBackIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M208,47.88V208.12a16,16,0,0,1-24.43,13.43L64,146.77V216a8,8,0,0,1-16,0V40a8,8,0,0,1,16,0v69.23L183.57,34.45A15.95,15.95,0,0,1,208,47.88Z" />
  </FillIcon>
);

/** Step forward one frame: an arrow pointing into a bar. Phosphor `skip-forward`, Fill. */
export const StepForwardIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M208,40V216a8,8,0,0,1-16,0V146.77L72.43,221.55A15.95,15.95,0,0,1,48,208.12V47.88A15.95,15.95,0,0,1,72.43,34.45L192,109.23V40a8,8,0,0,1,16,0Z" />
  </FillIcon>
);

/** Previous cut. Phosphor `caret-double-left`, Fill. */
export const PreviousCutIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M208,48V208a8,8,0,0,1-13.66,5.66L128,147.31V208a8,8,0,0,1-13.66,5.66l-80-80a8,8,0,0,1,0-11.32l80-80A8,8,0,0,1,128,48v60.69l66.34-66.35A8,8,0,0,1,208,48Z" />
  </FillIcon>
);

/** Next cut. Phosphor `caret-double-right`, Fill. */
export const NextCutIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M221.66,133.66l-80,80A8,8,0,0,1,128,208V147.31L61.66,213.66A8,8,0,0,1,48,208V48a8,8,0,0,1,13.66-5.66L128,108.69V48a8,8,0,0,1,13.66-5.66l80,80A8,8,0,0,1,221.66,133.66Z" />
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

/** Guides: the picture's frame drawn dashed. Phosphor `rectangle-dashed`, Fill. */
export const GuidesIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM80,192H64a16,16,0,0,1-16-16V144a8,8,0,0,1,16,0v32H80a8,8,0,0,1,0,16ZM80,80H64v32a8,8,0,0,1-16,0V80A16,16,0,0,1,64,64H80a8,8,0,0,1,0,16Zm64,112H112a8,8,0,0,1,0-16h32a8,8,0,0,1,0,16Zm0-112H112a8,8,0,0,1,0-16h32a8,8,0,0,1,0,16Zm64,96a16,16,0,0,1-16,16H176a8,8,0,0,1,0-16h16V144a8,8,0,0,1,16,0Zm0-64a8,8,0,0,1-16,0V80H176a8,8,0,0,1,0-16h16a16,16,0,0,1,16,16Z" />
  </FillIcon>
);

/** Phosphor `bookmark-simple`, Fill. */
export const BookmarkIcon = (props: IconProps) => (
  <FillIcon {...props}>
    <path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z" />
  </FillIcon>
);

/** Link: two chain links, for "Copy link at timecode". Our own outline drawing. */
export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10.5 13.5a3.75 3.75 0 0 0 5.3 0l3-3a3.75 3.75 0 0 0-5.3-5.3l-1.25 1.25" />
    <path d="M13.5 10.5a3.75 3.75 0 0 0-5.3 0l-3 3a3.75 3.75 0 0 0 5.3 5.3l1.25-1.25" />
  </Icon>
);
