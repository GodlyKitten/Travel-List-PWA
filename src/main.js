import './styles.css';
import { route, start, setDefault, setFallback } from './router.js';
import { el } from './ui.js';
import { mountHome } from './views/home.js';
import { mountSetup } from './views/setup.js';
import { mountMyLists } from './views/mylists.js';
import { mountChecklist } from './views/checklist.js';
import { mountShare } from './views/share.js';

const app = document.getElementById('app');

route(/^\/home$/, () => mountHome(app));
route(/^\/setup$/, () => mountSetup(app));
route(/^\/mylists$/, () => mountMyLists(app));
route(/^\/list\/([A-Za-z0-9_-]+)$/, ([id]) => mountChecklist(app, id));
route(/^\/share\/([A-Za-z0-9_\-]+)$/, ([encoded]) => mountShare(app, encoded));

setDefault(() => '/home');
setFallback(() => mountHome(app));

window.addEventListener('pack:storage-error', () => {
  if (document.querySelector('.banner')) return;
  const banner = el('div', { class: 'banner' },
    'Storage unavailable (private browsing?). Changes won’t be saved.'
  );
  document.body.insertBefore(banner, document.body.firstChild);
});

start();
