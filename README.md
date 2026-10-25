**this extension is written by AI and edited on [open in chromium](https://addons.mozilla.org/zh-CN/firefox/addon/open-in-chromium-browser/) extension by  Andy Portmen.**

# Open in Helium Browser

This Firefox extension opens the current tab, selected links, or multiple tabs in [Helium](https://helium.computer/).

## macOS native messaging

The extension uses the native host ID `com.add0n.node`. Helium looks for its native messaging host manifest here:

```text
~/Library/Application Support/net.imput.helium/NativeMessagingHosts/com.add0n.node.json
```

Install the native client from the existing helper page, then make sure the installer places `com.add0n.node.json` in that directory. The manifest must point to the native client's executable and allow this extension ID:

```json
{
  "name": "com.add0n.node",
  "description": "Native client for Open in Helium Browser",
  "path": "/absolute/path/to/native-client",
  "type": "stdio",
  "allowed_extensions": [
    "{4d3bd246-4326-4ec1-bb49-a27cfd57ca08}"
  ]
}
```

The browser executable is launched as `open -a Helium` on macOS. On Linux and Windows, the default executable names and paths are configured in `config.js` and can be overridden from the extension options page.
