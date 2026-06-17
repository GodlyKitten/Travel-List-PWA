const routes = [];
let fallback = null;
let defaultResolver = null;

export function route(pattern, handler) {
  routes.push({ pattern, handler });
}

export function setDefault(resolver) {
  defaultResolver = resolver;
}

export function setFallback(handler) {
  fallback = handler;
}

export function start() {
  window.addEventListener('hashchange', dispatch);
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    const def = defaultResolver ? defaultResolver() : '/mylists';
    location.replace('#' + (def.startsWith('/') ? def : '/' + def));
  } else {
    dispatch();
  }
}

export function go(path) {
  const target = path.startsWith('#') ? path : '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === target) {
    dispatch();
  } else {
    location.hash = target;
  }
}

export function replace(path) {
  const target = path.startsWith('#') ? path : '#' + (path.startsWith('/') ? path : '/' + path);
  location.replace(target);
}

function dispatch() {
  const hash = location.hash.replace(/^#/, '') || '/';
  for (const { pattern, handler } of routes) {
    const m = hash.match(pattern);
    if (m) {
      try { handler(m.slice(1)); }
      catch (err) { console.error('Route handler error:', err); }
      return;
    }
  }
  if (fallback) fallback();
  else if (defaultResolver) replace(defaultResolver());
}
