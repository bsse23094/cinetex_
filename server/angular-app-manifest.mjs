
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/search",
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/search"
  },
  {
    "renderMode": 0,
    "route": "/movie/*"
  },
  {
    "renderMode": 2,
    "route": "/lists"
  },
  {
    "renderMode": 2,
    "route": "/favorites"
  },
  {
    "renderMode": 0,
    "route": "/list/*"
  },
  {
    "renderMode": 2,
    "route": "/rated"
  },
  {
    "renderMode": 0,
    "route": "/watch/*"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 18466, hash: '09622b7619b37b460d3801a4bfefc9a67ab2f724e8f5b7e0dbdb7fc841089396', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17671, hash: 'bc786b5f205e1336f5e266f89ce27663d00662ffb9f057edcdf5a484db0e394f', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'search/index.html': {size: 41068, hash: '9a04813637c4a01e6086b6b8f1aad3c3068ee60dca7ca851dd8d9e0eb74c4529', text: () => import('./assets-chunks/search_index_html.mjs').then(m => m.default)},
    'lists/index.html': {size: 39328, hash: '5c317d7fd5cc9aa364d72a4871b958543b12b6854497475b47021362d5890d80', text: () => import('./assets-chunks/lists_index_html.mjs').then(m => m.default)},
    'rated/index.html': {size: 36373, hash: 'f9b7fc82330245623cc5c88f9dd88a242a2c43e4938f85442c7de6c3d5450299', text: () => import('./assets-chunks/rated_index_html.mjs').then(m => m.default)},
    'favorites/index.html': {size: 36251, hash: '1e28fe620dcc10bf7777d822173887c121c30ad66ce22bdf3f05656fa41b29ea', text: () => import('./assets-chunks/favorites_index_html.mjs').then(m => m.default)},
    'styles-XFVYPH2J.css': {size: 24835, hash: 'C8tAbeNjcB4', text: () => import('./assets-chunks/styles-XFVYPH2J_css.mjs').then(m => m.default)}
  },
};
