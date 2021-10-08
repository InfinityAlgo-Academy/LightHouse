/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useEffect, useState} from 'preact/hooks';

import {NavigationIcon, SnapshotIcon, TimespanIcon} from './icons';
import {getFilmstripFrames, getScreenDimensions, getScreenshot} from './util';

const ANIMATION_FRAME_DURATION_MS = 250;

export const Separator: FunctionComponent = () => {
  return <div className="Separator" role="separator"></div>;
};

export const FlowStepIcon: FunctionComponent<{mode: LH.Result.GatherMode}> = ({mode}) => {
  return <>
    {
      mode === 'navigation' && <NavigationIcon/>
    }
    {
      mode === 'timespan' && <TimespanIcon/>
    }
    {
      mode === 'snapshot' && <SnapshotIcon/>
    }
  </>;
};

export const FlowSegment: FunctionComponent<{mode?: LH.Result.GatherMode}> = ({mode}) => {
  return (
    <div className="FlowSegment">
      <div className="FlowSegment__top-line"/>
      {
        mode && <FlowStepIcon mode={mode}/>
      }
      <div className="FlowSegment__bottom-line"/>
    </div>
  );
};

const FlowStepAnimatedThumbnail: FunctionComponent<{
  frames: Array<{data: string}>,
  width: number,
  height: number,
}> = ({frames, width, height}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  // Handle a frame array of a different length being set.
  const effectiveFrameIndex = frameIndex % frames.length;

  useEffect(() => {
    const interval = setInterval(
      () => setFrameIndex(i => (i + 1) % frames.length),
      ANIMATION_FRAME_DURATION_MS
    );

    return () => clearInterval(interval);
  }, [frames.length]);

  return (
    <img
      className="FlowStepThumbnail"
      data-testid="FlowStepAnimatedThumbnail"
      src={frames[effectiveFrameIndex].data}
      style={{width, height}}
      alt="Animated screenshots of a page tested by Lighthouse"
    />
  );
};

export const FlowStepThumbnail: FunctionComponent<{
  reportResult: LH.ReportResult,
  width?: number,
  height?: number,
}> = ({reportResult, width, height}) => {
  const screenshot = getScreenshot(reportResult);
  const frames = getFilmstripFrames(reportResult);

  // Resize the image to fit the viewport aspect ratio.
  const dimensions = getScreenDimensions(reportResult);
  if (width && height === undefined) {
    height = dimensions.height * width / dimensions.width;
  } else if (height && width === undefined) {
    width = dimensions.width * height / dimensions.height;
  }

  if (!width || !height) {
    console.warn(new Error('FlowStepThumbnail requested without any dimensions').stack);
    return <></>;
  }

  if (reportResult.gatherMode === 'timespan' && frames && frames.length) {
    return <FlowStepAnimatedThumbnail frames={frames} width={width} height={height} />;
  }

  return <>
    {
      screenshot &&
        <img
          className="FlowStepThumbnail"
          src={screenshot}
          style={{width, height}}
          alt="Screenshot of a page tested by Lighthouse"
        />
    }
  </>;
};
