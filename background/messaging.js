export class MessageManager {
  constructor(controller) {
    this.controller = controller;

    this.port;

    browser.runtime.onConnect.addListener(port => {
      if (!port.name === "proxyBrowserAction") {
        return;
      }

      this.port = port;

      this.messageListener = this.onMessageReceived();

      port.onMessage.addListener(this.messageListener);
    });
  }

  onMessageReceived() {
    return message => {
      this.controller.handleEvent(message);
    };
  }

  sendMessage(message) {
    if (this.port) {
      this.port.postMessage(message);
    }
  }
}
