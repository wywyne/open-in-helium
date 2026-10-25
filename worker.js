/* global app */

if (typeof importScripts !== 'undefined') {
  self.importScripts('./config.js');
}

const notify = async (msg, b = 'E') => {
  const [t] = await chrome.tabs.query({
    currentWindow: true,
    active: true
  });
  chrome.action.setBadgeText({
    tabId: t.id,
    text: b
  });
  chrome.action.setTitle({
    tabId: t.id,
    title: msg
  });
  chrome.tabs.sendMessage(t.id, {
    method: 'notify',
    message: msg
  });
};

// Badge Color
{
  const once = async () => {
    if (once.done) {
      return;
    }
    once.done = true;

    const prefs = await chrome.storage.local.get({
      'badge-color': '#c2175b'
    });
    chrome.action.setBadgeBackgroundColor({
      color: prefs['badge-color']
    });
  };
  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
}

const os = {
  mac: navigator.userAgent.indexOf('Mac') !== -1,
  linux: navigator.userAgent.indexOf('Linux') !== -1
};

function error(response) {
  notify(`An error occurred:

Exit Code: ${response.code}
Output:    ${response.stdout}
Error:     ${response.stderr}`);
}

async function response(res, success = () => {}) {
  // windows batch file returns 1
  if (res && (res.code !== 0 && (res.code !== 1 || res.stderr !== ''))) {
    error(res);
  }
  else if (!res) {
    const tabs = await chrome.tabs.query({
      url: chrome.runtime.getURL('data/helper/index.html')
    });
    if (tabs && tabs.length) {
      chrome.tabs.update(tabs[0].id, {
        active: true
      });
      chrome.windows.update(tabs[0].windowId, {
        focused: true
      });
    }
    else {
      chrome.tabs.create({
        url: 'data/helper/index.html'
      });
    }
  }
  else {
    success();
  }
}

function exec(command, args, callback, properties = {}) {
  if (command) {
    chrome.runtime.sendNativeMessage(app.id, {
      cmd: 'exec',
      command,
      arguments: args,
      properties
    }, res => (callback || response)(res));
  }
  else {
    notify(`Please set the "${app.locale.name}" executable path in the options page`, '!');
    chrome.runtime.openOptionsPage();
  }
}

function find(callback) {
  chrome.runtime.sendNativeMessage(app.id, {
    cmd: 'env'
  }, res => {
    if (res && res.env && res.env.ProgramFiles) {
      chrome.storage.local.set({
        path: app.runtime.windows.prgfiles
          .replace('%LOCALAPPDATA%', res.env.LOCALAPPDATA)
          .replace('%ProgramFiles(x86)%', res.env['ProgramFiles(x86)'])
          .replace('%ProgramFiles%', res.env.ProgramFiles)
      }, callback);
    }
    else {
      response(res);
    }
  });
}


const open = async (urls, closeIDs = []) => {
  const prefs = await chrome.storage.local.get({
    path: null,
    closeme: false
  });
  const close = () => {
    if (prefs.closeme && closeIDs.length) {
      chrome.tabs.remove(closeIDs);
    }
  };
  if (os.mac) {
    if (prefs.path) {
      const length = app.runtime.mac.args.length;
      app.runtime.mac.args[length - 1] = prefs.path;
    }
    exec('open', [...app.runtime.mac.args, ...urls], r => response(r, close));
  }
  else if (os.linux) {
    exec(prefs.path || app.runtime.linux.name, urls, r => response(r, close));
  }
  else {
    if (prefs.path) {
      exec(prefs.path, [...(app.runtime.windows.args2 || []), ...urls], r => response(r, close));
    }
    else {
      // Firefox is not detaching the process on Windows
      const args = [...app.runtime.windows.args];
      args[1] = args[1].replace('start', navigator.userAgent.indexOf('Firefox') !== -1 ? 'start /WAIT' : 'start');
      args[2] = args[2].replace('%url;', urls.join(' '));

      exec(app.runtime.windows.name, args, res => {
        // use old method
        if (res && res.code !== 0) {
          find(() => open(urls, closeIDs));
        }
        else {
          response(res, close);
        }
      }, {windowsVerbatimArguments: true});
    }
  }
};

async function delayOpen(tabs) {
  const prefs = await chrome.storage.local.get({
    multiple: app.multiple
  });
  if (prefs.multiple) {
    return open(tabs.map(t => t.url), tabs.map(t => t.id));
  }
  for (const tab of tabs) {
    open([tab.url], [tab.id]);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  open(tabs.map(t => t.url), tabs.map(t => t.id));
});
// context menu
{
  const callback = () => {
    if (callback.once) {
      return;
    }
    callback.once = true;

    chrome.contextMenus.create({
      id: 'open-current',
      title: app.locale.current,
      contexts: ['link'],
      documentUrlPatterns: ['*://*/*']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'open-all',
      title: app.locale.all,
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'open-call',
      title: app.locale.call,
      contexts: ['action']
    }, () => chrome.runtime.lastError);
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'open-current') {
    open([info.linkUrl || info.pageUrl], []);
  }
  else if (info.menuItemId === 'open-all') {
    chrome.tabs.query({
      url: ['*://*/*']
    }, delayOpen);
  }
  else if (info.menuItemId === 'open-call') {
    chrome.tabs.query({
      url: ['*://*/*'],
      currentWindow: true
    }, delayOpen);
  }
});
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.cmd === 'open-in') {
    open([request.url], [sender.tab.id]);
    if (request.close) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}

