import type {
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const extensions: (TabRoutePageExtension | TabRouteTabExtension)[] = [
  {
    type: 'app.tab-route/page',
    properties: {
      id: 'data-tab-page',
      title: 'Data Registry',
      href: '/ai-hub/data',
      path: '/ai-hub/data/*',
      group: '4_data',
      section: 'ai-hub',
    },
  },
  {
    type: 'app.tab-route/tab',
    properties: {
      pageId: 'data-tab-page',
      id: 'collections',
      title: 'Collections',
      component: () => import('./DataRegistryWrapper'),
      group: '1_collections',
    },
  },
  {
    type: 'app.tab-route/tab',
    properties: {
      pageId: 'data-tab-page',
      id: 'connections',
      title: 'Connections',
      component: () => import('./DataConnectionsWrapper'),
      group: '2_connections',
    },
  },
];

export default extensions;
