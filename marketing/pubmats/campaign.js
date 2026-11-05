// Fills [data-part] slots with artwork rendered from the app's components (parts/parts.json) and signals readiness.
(async () => {
  const parts = await (await fetch("parts/parts.json")).json();
  document.body.insertAdjacentHTML("afterbegin", parts.defs);
  document.querySelectorAll("[data-part]").forEach((el) => { el.innerHTML = parts[el.dataset.part] ?? ""; });
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  window.__ready = true;
})();
