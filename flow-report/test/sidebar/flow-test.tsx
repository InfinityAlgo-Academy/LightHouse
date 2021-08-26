import fs from 'fs';
import {SidebarFlow} from '../../src/sidebar/flow';
import {render} from '@testing-library/preact';
import {FunctionComponent} from 'preact';
import {FlowResultContext} from '../../src/util';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

const flowResult = JSON.parse(
  fs.readFileSync(
    // eslint-disable-next-line max-len
    `${dirname(fileURLToPath(import.meta.url))}/../../../lighthouse-core/test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
    'utf-8'
  )
);

let mockLocation: URL;
let wrapper: FunctionComponent;

beforeEach(() => {
  mockLocation = new URL('file:///Users/example/report.html');
  Object.defineProperty(window, 'location', {
    get: () => mockLocation,
  });
  wrapper = ({children}) => (
    <FlowResultContext.Provider value={flowResult}>{children}</FlowResultContext.Provider>
  );
});

describe('SidebarFlow', () => {
  it('renders flow steps', async () => {
    const root = render(<SidebarFlow/>, {wrapper});

    const navigation = await root.findByText('Navigation (1)');
    const timespan = await root.findByText('Timespan (1)');
    const snapshot = await root.findByText('Snapshot (1)');
    const navigation2 = await root.findByText('Navigation (2)');

    const links = await root.findAllByRole('link') as HTMLAnchorElement[];
    expect(links.map(a => a.textContent)).toEqual([
      navigation.textContent,
      timespan.textContent,
      snapshot.textContent,
      navigation2.textContent,
    ]);
    expect(links.map(a => a.href)).toEqual([
      'file:///Users/example/report.html#index=0',
      'file:///Users/example/report.html#index=1',
      'file:///Users/example/report.html#index=2',
      'file:///Users/example/report.html#index=3',
    ]);
  });

  it('no steps highlighted on summary page', async () => {
    const root = render(<SidebarFlow/>, {wrapper});

    const links = await root.findAllByRole('link');
    const highlighted = links.filter(h => h.classList.contains('Sidebar--current'));

    expect(highlighted).toHaveLength(0);
  });

  it('highlight current step', async () => {
    mockLocation.hash = '#index=1';
    const root = render(<SidebarFlow/>, {wrapper});

    const links = await root.findAllByRole('link');
    const highlighted = links.filter(h => h.classList.contains('Sidebar--current'));

    expect(highlighted).toHaveLength(1);
    expect(links[1]).toEqual(highlighted[0]);
  });
});
