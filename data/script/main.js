{
  let port;
  try {
    port = document.getElementById('oichr-port');
    port.remove();
  }
  catch (e) {
    port = document.createElement('span');
    port.id = 'oichr-port';
    document.documentElement.append(port);
  }

  const user = evt => {
    const s = document.createElement('script');
    s.textContent = port.dataset.script;
    s.evt = evt;
    document.documentElement.append(s);
    s.remove();

    const {block, url, close} = s.dataset;
    if (block === 'true' && url) {
      port.dispatchEvent(new CustomEvent('user-action', {
        detail: {
          url,
          close: close === 'true'
        }
      }));
    }
  };

  const observer = new MutationObserver(() => {
    const script = port.dataset.script;
    document.removeEventListener('click', user, true);
    if (script) {
      document.addEventListener('click', user, true);
    }
  });
  observer.observe(port, {
    attributes: true,
    attributeFilter: ['data-script']
  });
}
