/** @jsxImportSource react */

import { Slider as SliderPrimitive, TimeSlider as TimeSliderPrimitive } from '@videojs/react';

export interface ThumbnailSlot {
  /** Draws the storyboard frame in the slider preview in place of the one the skin renders. */
  renderThumbnail?: SliderPrimitive.Thumbnail.ImageProps['render'];
}

/**
 * The seek bar: track, buffered range, fill, playhead thumb, chapter segments when the media has chapters, and a hover
 * preview with the time, the chapter title, and a storyboard thumbnail when the media provides one.
 */
export function TimeSlider({ renderThumbnail }: ThumbnailSlot = {}) {
  return (
    <TimeSliderPrimitive.Root className={'media-time-slider'}>
      <TimeSliderPrimitive.Chapters
        className={'media-time-slider-chapters'}
        renderChapter={(props) => (
          <div className={'media-time-slider-chapter'} {...props}>
            <TimeSliderPrimitive.Track className={'media-time-slider-track'}>
              <TimeSliderPrimitive.Buffer className={'media-time-slider-buffer'} />
              <TimeSliderPrimitive.Fill className={'media-time-slider-fill'} />
            </TimeSliderPrimitive.Track>
          </div>
        )}
      ></TimeSliderPrimitive.Chapters>
      <TimeSliderPrimitive.Thumb className={'media-time-slider-thumb'} />

      <TimeSliderPrimitive.Preview className={'media-time-slider-preview'}>
        <SliderPrimitive.Thumbnail.Root className={'media-slider-thumbnail'}>
          <SliderPrimitive.Thumbnail.Image render={renderThumbnail} className={'media-slider-thumbnail-image'} />
        </SliderPrimitive.Thumbnail.Root>
        <div className={'media-time-slider-preview-label'}>
          <TimeSliderPrimitive.Value className={'media-time-slider-value'} type="pointer" />
          <TimeSliderPrimitive.ChapterTitle className={'media-time-slider-chapter-title'} />
        </div>
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
