/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare module 'speedline' {
	interface SpeedlineOutput {
		beginning: number;
		end: number;
		frames: Array<{
			getHistogram(): number[][];
			getTimeStamp(): number;
			getImage(): Buffer;
			setProgress(progress: number, isInterpolated: boolean): void;
			setPerceptualProgress(progress: number, isInterpolated: boolean): void;
			getProgress(): number;
			getPerceptualProgress(): number;
			isProgressInterpolated(): boolean;
			isPerceptualProgressInterpolated(): boolean;
		}>;
		first: number;
		complete: number;
		duration: number;
	
		// TODO: speedIndex may actually be optional based on input options.
		// Use a more clever way to declare these exist based on SpeedlineOptions['include']
		speedIndex: number;
		perceptualSpeedIndex?: number;
	}
	
	interface SpeedlineOptions {
		timeOrigin?: number;
		fastMode?: boolean;
		include?: 'all' | 'speedIndex' | 'perceptualSpeedIndex';
	}

  function speedline(trace: LH.TraceEvent[], opts: SpeedlineOptions): SpeedlineOutput;

  export = speedline;
}
