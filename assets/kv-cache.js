export function kvCacheBytes({length, batch, kvHeads, layers = 32, headSize = 128, bytesPerValue = 2}) {
  return batch * length * layers * 2 * kvHeads * headSize * bytesPerValue;
}

const estimator = typeof document === 'undefined' ? null : document.querySelector('[data-kv-estimator]');

if (estimator) {
  const length = estimator.querySelector('[data-kv-length]');
  const heads = estimator.querySelector('[data-kv-heads]');
  const batch = estimator.querySelector('[data-kv-batch]');
  const total = estimator.querySelector('[data-kv-total]');

  function update() {
    const bytes = kvCacheBytes({
      length: Number(length.value),
      batch: Number(batch.value),
      kvHeads: Number(heads.value),
    });
    total.value = `${(bytes / 2 ** 30).toFixed(2)} GiB`;
  }

  estimator.addEventListener('change', update);
  update();
  estimator.hidden = false;
}
