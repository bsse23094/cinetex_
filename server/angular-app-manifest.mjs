
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
    'index.csr.html': {size: 21137, hash: 'aaf5ac047c896f467f890d9c62485920b19ce66dd857e2337e84c61765a07d26', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 20096, hash: '8afb27f515ab4d186a496e0250fab07004cf902124c962ded54a1e1bc5256647', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'lists/index.html': {size: 40987, hash: '9e054c39860b734cd9921f4b351155ff970c1b6534047477146698751c4977ec', text: () => import('./assets-chunks/lists_index_html.mjs').then(m => m.default)},
    'rated/index.html': {size: 38112, hash: 'c680d17d65f5a896bb6558c593fdef028e56a2ec455b56dad60a227bedd7b791', text: () => import('./assets-chunks/rated_index_html.mjs').then(m => m.default)},
    'favorites/index.html': {size: 37991, hash: '8ca50d0b37f47fddabcd6bb9994226300aa74a08c60e66944fe13b689e2e4d56', text: () => import('./assets-chunks/favorites_index_html.mjs').then(m => m.default)},
    'search/index.html': {size: 37825, hash: '666a81081d90d428e0576867212d9ab8eb004367540a83648a138afc4283d0db', text: () => import('./assets-chunks/search_index_html.mjs').then(m => m.default)},
    'styles-Q6XK57AL.css': {size: 25094, hash: 'L6us7yJ+7Bo', text: () => import('./assets-chunks/styles-Q6XK57AL_css.mjs').then(m => m.default)}
  },
};
