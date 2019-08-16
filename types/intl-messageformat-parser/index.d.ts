declare module 'intl-messageformat-parser' {
  export interface Element {
    type: 'messageTextElement'|'argumentElement';
    id?: string
    value?: string
    format?: null | {type: string; style?: string; options?: any};
  }
  function parse(message: string): {elements: Element[]};
  export {parse};
}
