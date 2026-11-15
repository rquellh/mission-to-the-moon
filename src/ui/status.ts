import { byId } from './dom';

export interface StatusDisplay {
  setLoadingText(text: string): void;
  setProgress(loaded: number, total: number): void;
  /** Hide the loading indicator and fade the 3D view in. */
  reveal(): void;
  /** Show a friendly message over the view. */
  showMessage(text: string, offerReload: boolean): void;
  hideMessage(): void;
}

export function setUpStatus(canvas: HTMLCanvasElement): StatusDisplay {
  const loading = byId('loading', HTMLDivElement);
  const loadingText = byId('loading-text', HTMLParagraphElement);
  const progress = byId('loading-progress', HTMLProgressElement);
  const message = byId('message', HTMLDivElement);
  const messageText = byId('message-text', HTMLParagraphElement);
  const reload = byId('message-reload', HTMLButtonElement);

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
    showMessage(text, offerReload) {
      loading.hidden = true;
      messageText.textContent = text;
      reload.hidden = !offerReload;
      message.hidden = false;
    },
    hideMessage() {
      message.hidden = true;
    },
  };
}
