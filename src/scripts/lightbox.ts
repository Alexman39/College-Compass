/**
 * Click-to-enlarge for images in lesson text (the old site had this for the
 * UML diagrams). Each image gets wrapped in a real <button>, so it works
 * with the keyboard; the large view is a native <dialog>, which handles
 * Esc, focus trapping and returning focus for us.
 */
const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
const big = dialog?.querySelector('img');

if (dialog && big) {
  document.querySelectorAll<HTMLImageElement>('.prose img').forEach((img) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'zoom';
    button.setAttribute('aria-label', `Μεγέθυνση εικόνας: ${img.alt}`);
    img.replaceWith(button);
    button.append(img);
    button.addEventListener('click', () => {
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      dialog.showModal();
    });
  });

  // Clicking the dark backdrop (outside the picture) closes it too.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
