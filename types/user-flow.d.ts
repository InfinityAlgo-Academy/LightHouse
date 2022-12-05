import {UserFlow as UserFlow_} from '../core/user-flow';

declare module UserFlow {
  export interface FlowArtifacts {
    gatherSteps: GatherStep[];
    name?: string;
  }

  export interface Options {
    /** Config to use for each flow step. */
    config?: LH.Config.Json;
    /** Base flags to use for each flow step. Step specific flags will override these flags. */
    flags?: LH.Flags;
    /** Display name for this user flow. */
    name?: string;
  }

  export interface StepFlags extends LH.Flags {
    /** Display name for this flow step. */
    name?: string;
  }

  export interface GatherStep {
    artifacts: LH.Artifacts;
    flags?: StepFlags;
  }
}

type UserFlow = InstanceType<typeof UserFlow_>;

export default UserFlow;
