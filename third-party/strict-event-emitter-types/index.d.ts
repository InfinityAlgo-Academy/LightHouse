// Modified from
// https://github.com/bterlson/strict-event-emitter-types/blob/96b30cae8d128c166b575c4c9a524c997ab4f040/src/index.ts
// for better JSDoc support (as of TS 2.8, JSDoc does not support method overrides
// in JS, so not possible to implement the original OverriddenMethods).

// Returns any keys of TRecord with the type of TMatch
export type MatchingKeys<
  TRecord,
  TMatch,
  K extends keyof TRecord = keyof TRecord
  > = K extends (TRecord[K] extends TMatch ? K : never) ? K : never;

// Returns any property keys of Record with a void type
export type VoidKeys<Record> = MatchingKeys<Record, void>;

// TODO: Stash under a symbol key once TS compiler bug is fixed
export interface TypeRecord<T, U, V> {
  ' _emitterType'?: T,
  ' _eventsType'?: U,
  ' _emitType'?: V
}


// EventEmitter method overrides, modified so no overloaded methods.
export type OverriddenMethods<
  TEventRecord,
  TEmitRecord = TEventRecord
  > = {
    on<P extends keyof TEventRecord>(event: P, listener: TEventRecord[P] extends void ? () => void : (m: TEventRecord[P], ...args: any[]) => void): void

    addListener<P extends keyof TEventRecord>(event: P, listener: TEventRecord[P] extends void ? () => void : (m: TEventRecord[P], ...args: any[]) => void): void

    addEventListener<P extends keyof TEventRecord>(event: P, listener: TEventRecord[P] extends void ? () => void : (m: TEventRecord[P], ...args: any[]) => void): void

    removeListener<P extends keyof TEventRecord>(event: P, listener: Function): any;

    once<P extends keyof TEventRecord>(event: P, listener: TEventRecord[P] extends void ? () => void : (m: TEventRecord[P], ...args: any[]) => void): void

    // TODO(bckenny): breaking change from original. A void TEmitRecord[P] meant
    // no second parameter, but now a second one is always required and must
    // extend `void` (e.g. `undefined`).
    emit<P extends keyof TEmitRecord>(event: P, request: TEmitRecord[P]): void;
  }

export type OverriddenKeys = keyof OverriddenMethods<any, any>

export type StrictEventEmitter<
  TEmitterType,
  TEventRecord,
  TEmitRecord = TEventRecord,
  UnneededMethods extends Exclude<OverriddenKeys, keyof TEmitterType>
  = Exclude<OverriddenKeys, keyof TEmitterType>,
  NeededMethods extends Exclude<OverriddenKeys, UnneededMethods>
  = Exclude<OverriddenKeys, UnneededMethods>
  > =
  // Store the type parameters we've instantiated with so we can refer to them later
  TypeRecord<TEmitterType, TEventRecord, TEmitRecord> &

  // Pick all the methods on the original type we aren't going to override
  Pick<TEmitterType, Exclude<keyof TEmitterType, OverriddenKeys>> &

  // Finally, pick the needed overrides (taking care not to add an override for a method
  // that doesn't exist)
  Pick<OverriddenMethods<TEventRecord, TEmitRecord>, NeededMethods>;

export default StrictEventEmitter;

export type NoUndefined<T> = T extends undefined ? never : T;

export type StrictBroadcast<
  TEmitter extends TypeRecord<any, any, any>,
  TEmitRecord extends NoUndefined<TEmitter[' _emitType']> = NoUndefined<TEmitter[' _emitType']>,
  VK extends VoidKeys<TEmitRecord> = VoidKeys<TEmitRecord>,
  NVK extends Exclude<keyof TEmitRecord, VK> =  Exclude<keyof TEmitRecord, VK>
  > = {
    <E extends NVK>(event: E, request: TEmitRecord[E]): void;
    <E extends VK>(event: E): void;
  }
