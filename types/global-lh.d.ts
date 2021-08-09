/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import ArbitraryEqualityMap_ = require('../lighthouse-core/lib/arbitrary-equality-map.js');
import * as Artifacts_ from './artifacts';
import Audit_ from './audit';
import Budget_ from './budget';
import Config_ from './config';
import _Crdp from 'devtools-protocol/types/protocol';
import _CrdpMappings from 'devtools-protocol/types/protocol-mapping';
import * as Externs from './externs';
import Gatherer_ from './gatherer';
import * as I18n from './i18n';
import LHError = require('../lighthouse-core/lib/lh-error.js');
import LHResult from './lhr';
import Protocol_ from './protocol';
import ReportResult_ from './html-renderer';
import StructuredData_ from './structured-data';
import Treemap_ from './treemap';

// Construct hierarchy of global types under the LH namespace.
declare global {
  module LH {
    export type ArbitraryEqualityMap = ArbitraryEqualityMap_;

    // artifacts.d.ts
    export import Artifacts = Artifacts_.Artifacts;
    export import BaseArtifacts = Artifacts_.BaseArtifacts;
    export import FRArtifacts = Artifacts_.FRArtifacts;
    export import FRBaseArtifacts = Artifacts_.FRBaseArtifacts;
    export import GathererArtifacts = Artifacts_.GathererArtifacts;
    export import DevtoolsLog = Artifacts_.DevtoolsLog;
    export import Trace = Artifacts_.Trace;
    export import TraceCpuProfile = Artifacts_.TraceCpuProfile;
    export import TraceEvent = Artifacts_.TraceEvent;

    export import Audit = Audit_;
    export import Budget = Budget_;
    export import Config = Config_;
    export import Crdp = _Crdp;
    export import CrdpEvents = _CrdpMappings.Events;
    export import CrdpCommands = _CrdpMappings.Commands;

    // externs.d.ts
    export import ThrottlingSettings = Externs.ThrottlingSettings;
    export import ScreenEmulationSettings = Externs.ScreenEmulationSettings;
    export import SharedFlagsSettings = Externs.SharedFlagsSettings;
    export import OutputMode = Externs.OutputMode;
    export import PrecomputedLanternData = Externs.PrecomputedLanternData;
    export import Flags = Externs.Flags;
    export import CliFlags = Externs.CliFlags;
    export import RunnerResult = Externs.RunnerResult;
    export import DevToolsJsonTarget = Externs.DevToolsJsonTarget;

    export import Gatherer = Gatherer_;
    export import LighthouseError = LHError;
    export import Result = LHResult;

    // i18n.d.ts.
    export import Locale = I18n.Locale;
    export import IcuMessage = I18n.IcuMessage;
    export import RawIcu = I18n.RawIcu;
    export import FormattedIcu = I18n.FormattedIcu;
    export import IcuMessagePaths = I18n.IcuMessagePaths;
    export import I18NRendererStrings = I18n.I18NRendererStrings;

    export import Protocol = Protocol_;
    export import ReportResult = ReportResult_;
    export import StructuredData = StructuredData_;
    export import Treemap = Treemap_;
  }
}
