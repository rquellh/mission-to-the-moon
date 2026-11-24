import { find } from './dom';

export interface DialogHandle {
  readonly element: HTMLDialogElement;
  /** Open as a modal and remember what to return focus to. */
  open(returnTo?: HTMLElement | null): void;
  close(): void;
}

/**
 * Wire a <dialog>: its Close button, closing on a click outside the box,
 * and returning focus to whatever opened it. Escape closes it natively.
 */
export function setUpDialog(dialog: HTMLDialogElement): DialogHandle {
  const closeButton = find(dialog, '.dialog__close', HTMLButtonElement);
  let returnTo: HTMLElement | null = null;

  closeButton.addEventListener('click', () => dialog.close());

  // Close when the backdrop (outside the dialog box) is clicked.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) dialog.close();
  });

  dialog.addEventListener('close', () => {
    if (returnTo?.isConnected) returnTo.focus();
    returnTo = null;
  });

  return {
    element: dialog,
    open(from) {
      returnTo =
        from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      const body = dialog.querySelector('.dialog__body');
      if (body) body.scrollTop = 0;
      closeButton.focus();
    },
    close() {
      dialog.close();
    },
  };
}
