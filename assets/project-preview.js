// Let the linked cover play once in view. The full player is on the project page.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

class ProjectPreview extends HTMLElement {
  connectedCallback() {
    const video = this.querySelector('video');
    if (!video) return;
    let visible = false;
    this.sync = () => {
      if (visible && !document.hidden && !reducedMotion.matches && !navigator.connection?.saveData
          && !document.body.classList.contains('motion-off') && !video.ended) {
        video.play().catch(() => { /* The poster remains available if autoplay is disabled. */ });
      } else {
        video.pause();
      }
    };
    this.observer = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= 0.35;
      this.sync();
    }, {threshold: [0, 0.35]});
    this.observer.observe(video);
    this.stateObserver = new MutationObserver(this.sync);
    this.stateObserver.observe(document.body, {attributes:true, attributeFilter:['class']});
    document.addEventListener('visibilitychange', this.sync);
    reducedMotion.addEventListener('change', this.sync);
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.stateObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.sync);
    reducedMotion.removeEventListener('change', this.sync);
    this.querySelector('video')?.pause();
  }
}
customElements.define('project-preview', ProjectPreview);
