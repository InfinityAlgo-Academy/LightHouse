declare module Smokehouse {
  export interface Difference {
    path: string;
    actual: any;
    expected: any;
  }

  export interface Comparison {
    category: string;
    actual: any;
    expected: any;
    equal: boolean;
    diff?: Difference | null;
  }

  export type ExpectedLHR = Pick<LH.Result, 'audits' | 'finalUrl' | 'requestedUrl'> & { errorCode?: string }

  export interface LHRComparison {
    audits: Comparison[];
    errorCode: Comparison;
    finalUrl: Comparison;
  }
}
