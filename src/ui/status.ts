import { byId } from './dom';

/** A button under a message, for example one that opens the mission list. */
export interface MessageAction {
  text: string;
  run(from: HTMLButtonElement): void;
}

export interface StatusDisplay {
  setLoadingText(text: string): void;
  setProgress(loaded: number, total: number): void;
  /** Hide the loading indicator and fade the 3D view in. */
  reveal(): void;
  /** Show a friendly message over the view, optionally with a Reload button and one other way on. */
  showMessage(text: string, offerReload: boolean, action?: MessageAction): void;
  hideMessage(): void;
}

export function setUpStatus(canvas: HTMLCanvasElement): StatusDisplay {
  const loading = byId('loading', HTMLDivElement);
  const loadingText = byId('loading-text', HTMLParagraphElement);
  const progress = byId('loading-progress', HTMLProgressElement);
  const message = byId('message', HTMLDivElement);
  const messageText = byId('message-text', HTMLParagraphElement);
  const reload = byId('message-reload', HTMLButtonElement);
  const actionButton = byId('message-action', HTMLButtonElement);
  let action: MessageAction | undefined;
  actionButton.addEventListener('click', () => action?.run(actionButton));

  reload.addEventListener('click', () => window.location.reload());

  return {
    setLoadingText(text) {
      loadingText.textContent = text;
    },
    setProgress(loaded, total) {
      progress.max = total;
      progress.value = loaded;
    },
    reveal() {
      loading.hidden = true;
      document.body.classList.add('is-ready');
      canvas.classList.add('stage--visible');
    },
    showMessage(text, offerReload, next) {
      loading.hidden = true;
      messageText.textContent = text;
      reload.hidden = !offerReload;
      action = next;
      actionButton.hidden = !next;
      actionButton.textContent = next?.text ?? '';
      message.hidden = false;
    },
    hideMessage() {
      message.hidden = true;
    },
  };
}
