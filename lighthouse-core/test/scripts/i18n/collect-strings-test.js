/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const collect = require('../../../scripts/i18n/collect-strings.js');
const esprima = require('esprima');

describe('Compute Description', () => {
  it('collects description', () => {
    const justUIStrings =
    `const UIStrings = {
        /** Description for Hello World. */
        message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World', 0);
    expect(res.description).toBe('Description for Hello World.');
  });

  it('errors when no description present', () => {
    const justUIStrings =
    `const UIStrings = {
        message: 'Hello World',
        /** ^ no description for this one. */
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    expect(() => collect.computeDescription(ast, prop, 'Hello World', 0))
      .toThrow(/No Description for message "Hello World"/);
  });

  it('errors when description is blank', () => {
    const justUIStrings =
    `const UIStrings = {
        /** */
        message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    expect(() => collect.computeDescription(ast, prop, 'Hello World', 0))
      .toThrow(/Empty description for message "Hello World"/);
  });

  it('errors when description is blank', () => {
    const justUIStrings =
    `const UIStrings = {
        /** 
         * @description
         */
        message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    expect(() => collect.computeDescription(ast, prop, 'Hello World', 0))
      .toThrow(/Empty @description for message "Hello World"/);
  });

  it('collects complex description', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       */
      message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World', 0);
    expect(res.description).toBe('Tagged description for Hello World.');
  });

  it.skip('collects complex multi-line description', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World,
       * which is a long description, that wraps.
       */
      message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World', 0);
    expect(res.description)
      .toBe('Tagged description for Hello World, which is a long description, that wraps.');
  });

  it('collects complex description with example', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       * @example {Variable example.} variable
       */
      message: 'Hello World {variable}',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World {variable}', 0);
    expect(res.description).toBe('Tagged description for Hello World.');
    expect(res.examples['variable']).toBe('Variable example.');
  });

  it('collects complex description with multiple examples', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       * @example {Variable example.} variable
       * @example {Variable2 example.} variable2
       */
      message: 'Hello World {variable} {variable2}',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World {variable} {variable2}', 0);
    expect(res.description).toBe('Tagged description for Hello World.');
    expect(res.examples['variable']).toBe('Variable example.');
    expect(res.examples['variable2']).toBe('Variable2 example.');
  });

  it('does not throw when no example for ICU', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       */
      message: 'Hello World {variable}',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World {variable}', 0);
    expect(res.description).toBe('Tagged description for Hello World.');
    expect(res.examples).toEqual({});
  });
});

describe('Convert Message to Placeholder', () => {
  it('passthroughs a basic message unchanged', () => {
    const message = 'Hello World.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    expect(res).toEqual({message, placeholders: undefined});
  });

  it('passthroughs an ICU plural unchanged', () => {
    const message = '{var, select, male{Hello Mr. Programmer.} ' +
      'female{Hello Ms. Programmer} other{Hello Programmer.}}';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    expect(res).toEqual({message, placeholders: undefined});
  });

  // TODO(exterkamp): more strict parsing for this case
  it.skip('passthroughs an ICU plural, with commas (Complex ICU parsing test), unchanged', () => {
    const message = '{var, select, male{Hello, Mr, Programmer.} ' +
      'female{Hello, Ms, Programmer} other{Hello, Programmer.}}';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    expect(res).toEqual({message, placeholders: {}});
  });

  it('converts code block to placeholder', () => {
    const message = 'Hello `World`.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello $MARKDOWN_SNIPPET_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`World`',
        example: 'World',
      },
    });
  });

  it('numbers code blocks in increasing order', () => {
    const message = '`Hello` `World`.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = '$MARKDOWN_SNIPPET_0$ $MARKDOWN_SNIPPET_1$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`Hello`',
        example: 'Hello',
      },
      MARKDOWN_SNIPPET_1: {
        content: '`World`',
        example: 'World',
      },
    });
  });

  it('errors when open backtick', () => {
    const message = '`Hello World.';
    expect(() => collect.convertMessageToPlaceholders(message, undefined))
      .toThrow(/Open backtick in message "`Hello World."/);
  });

  it('allows other markdown in code block', () => {
    const message = 'Hello World `[Link](https://google.com/)`.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello World $MARKDOWN_SNIPPET_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`[Link](https://google.com/)`',
        example: '[Link](https://google.com/)',
      },
    });
  });

  it('converts links to placeholders', () => {
    const message = 'Hello [World](https://google.com/).';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello $LINK_START_0$World$LINK_END_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      LINK_START_0: {
        content: '[',
      },
      LINK_END_0: {
        content: '](https://google.com/)',
      },
    });
  });

  it('catches common link markdown mistakes', () => {
    const message = 'Hello [World] (https://google.com/).';
    expect(() => collect.convertMessageToPlaceholders(message, undefined))
      .toThrow(/Bad Link syntax in message "Hello \[World\] \(https:\/\/google\.com\/\)\."/);
  });

  it('converts custom-formatted ICU to placholders', () => {
    const message = 'Hello World took {timeInMs, number, milliseconds} ms, ' +
      '{timeInSec, number, seconds} s, used {bytes, number, bytes} KB, ' +
      '{perc, number, percent} of {percEx, number, extendedPercent}.';

    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello World took $CUSTOM_ICU_0$ ms, ' +
    '$CUSTOM_ICU_1$ s, used $CUSTOM_ICU_2$ KB, ' +
    '$CUSTOM_ICU_3$ of $CUSTOM_ICU_4$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      CUSTOM_ICU_0: {
        content: '{timeInMs, number, milliseconds}',
        example: '499',
      },
      CUSTOM_ICU_1: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
      CUSTOM_ICU_2: {
        content: '{bytes, number, bytes}',
        example: '499',
      },
      CUSTOM_ICU_3: {
        content: '{perc, number, percent}',
        example: '54.6%',
      },
      CUSTOM_ICU_4: {
        content: '{percEx, number, extendedPercent}',
        example: '37.92%',
      },
    });
  });

  it('replaces within ICU plural', () => {
    const message = '{var, select, male{time: {timeInSec, number, seconds}} ' +
      'female{time: {timeInSec, number, seconds}} other{time: {timeInSec, number, seconds}}}';
    const expectation = '{var, select, male{time: $CUSTOM_ICU_0$} ' +
      'female{time: $CUSTOM_ICU_1$} other{time: $CUSTOM_ICU_2$}}';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    expect(res.message).toEqual(expectation);
    expect(res.placeholders).toEqual({
      CUSTOM_ICU_0: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
      CUSTOM_ICU_1: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
      CUSTOM_ICU_2: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
    });
  });

  it('errors when using non-supported custom-formatted ICU format', () => {
    const message = 'Hello World took {var, badFormat, milliseconds}.';
    expect(() => collect.convertMessageToPlaceholders(message, undefined)).toThrow(
      /Unsupported custom-formatted ICU format var "badFormat" in message "Hello World took "/);
  });

  it('errors when using non-supported custom-formatted ICU type', () => {
    const message = 'Hello World took {var, number, global_int}.';
    expect(() => collect.convertMessageToPlaceholders(message, undefined)).toThrow(
      /Unsupported custom-formatted ICU type var "global_int" in message "Hello World took "/);
  });

  it('converts direct ICU with examples to placeholders', () => {
    const message = 'Hello {name}.';
    const res = collect.convertMessageToPlaceholders(message, {name: 'Mary'});
    const expectation = 'Hello $ICU_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      ICU_0: {
        content: '{name}',
        example: 'Mary',
      },
    });
  });

  it('errors when example given without variable', () => {
    const message = 'Hello name.';
    expect(() => collect.convertMessageToPlaceholders(message, {name: 'Mary'}))
      // eslint-disable-next-line max-len
      .toThrow(/Example 'name' provided, but has not corresponding ICU replacement in message "Hello name."/);
  });

  it('errors when direct ICU has no examples', () => {
    const message = 'Hello {name}.';
    expect(() => collect.convertMessageToPlaceholders(message, undefined)).toThrow(
      /Variable 'name' is missing example comment in message "Hello {name}."/);
  });

  it('throws when message contains double dollar', () => {
    const message = 'Hello World$$';
    expect(() => collect.convertMessageToPlaceholders(message)).
      toThrow(/Ctc messages cannot contain double dollar: Hello World\$\$/);
  });

  it('throws when message contains double dollar, less obvious edition', () => {
    const message = 'Hello ${name}';
    expect(() => collect.convertMessageToPlaceholders(message, {name: 'Mary'})).
      toThrow(/Ctc messages cannot contain double dollar: Hello \$\$ICU_0\$/);
  });
});

describe('PseudoLocalizer', () => {
  it('adds cute hats to strings', () => {
    const strings = {
      hello: {
        message: 'world',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: 'ŵór̂ĺd̂',
      },
    });
  });

  it('does not pseudolocalize ICU messages', () => {
    const strings = {
      hello: {
        message: '{world}',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: '{world}',
      },
    });
  });

  it('does not pseudolocalize ordinal ICU message control markers', () => {
    const strings = {
      hello: {
        message: '{num_worlds, plural, =1{world} other{worlds}}',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: '{num_worlds, plural, =1{ŵór̂ĺd̂} other{ẃôŕl̂d́ŝ}}',
      },
    });
  });

  it('does not pseudolocalize placeholders', () => {
    const strings = {
      hello: {
        message: 'Hello $MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
            example: 'World',
          },
        },
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: 'Ĥél̂ĺô $MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
            example: 'World',
          },
        },
      },
    });
  });
});
