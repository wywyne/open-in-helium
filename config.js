'use strict';

self.app = {
  id: 'com.add0n.node',
  tag: 'helium',
  multiple: true,

  locale: {
    name: 'Helium',
    current: 'Open Link in Helium browser',
    all: 'Open all Tabs in Helium browser',
    call: 'Open all Tabs in Helium browser (Current window)',
    example: 'example /Applications/Helium.app'
  },

  runtime: {
    mac: {
      args: ['-a', 'Helium'],
      nativeMessagingHosts: '~/Library/Application Support/net.imput.helium/NativeMessagingHosts/'
    },
    linux: {
      name: 'helium'
    },
    windows: {
      name: 'cmd',
      args: ['/s/c', 'start', 'helium "%url;"'],
      prgfiles: '%ProgramFiles(x86)%\\Helium\\helium.exe'
    }
  }
};
