const background=document.querySelector('[data-learning-background]');
const video=background.querySelector('video');
const button=document.querySelector('[data-learning-motion]');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let preference;
try{preference=localStorage.getItem('cloudboy-motion')}catch{}
let enabled=!reduced.matches&&!navigator.connection?.saveData&&preference!=='off';
let attempt=0;
video.muted=true;
video.defaultMuted=true;
button.hidden=false;

function update(){
  const current=++attempt;
  button.textContent=enabled?'暂停背景':'播放背景';
  button.setAttribute('aria-pressed',String(enabled));
  if(!enabled||document.hidden){video.pause();return}
  if(!video.getAttribute('src'))video.src=video.dataset.src;
  video.play().catch(()=>{
    if(current!==attempt)return;
    enabled=false;
    update();
  });
}
video.addEventListener('playing',()=>background.classList.add('has-motion'));
video.addEventListener('error',()=>{background.classList.remove('has-motion');enabled=false;update()});
button.addEventListener('click',()=>{enabled=!enabled;update()});
document.addEventListener('visibilitychange',update);
reduced.addEventListener('change',()=>{if(reduced.matches)enabled=false;update()});
update();
