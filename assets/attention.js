// Fixed-logit teaching model: one target and N equal-score visible keys.
export function targetWeight(n, gap) {
  if(!Number.isFinite(n)||n<1||!Number.isFinite(gap))throw new RangeError('Invalid N or score gap');
  const x=Math.log(n)-gap;
  return x>=0?Math.exp(-x)/(1+Math.exp(-x)):1/(1+Math.exp(x));
}
export function requiredGap(n, p) {
  if(!Number.isFinite(n)||n<1||!Number.isFinite(p)||p<=0||p>=1)throw new RangeError('Invalid N or target weight');
  return Math.log(n)+Math.log(p)-Math.log1p(-p);
}

if(typeof document!=='undefined'){
  for(const lab of document.querySelectorAll('[data-attention-lab]')){
    const nInput=lab.querySelector('[data-lab-n]'),gapInput=lab.querySelector('[data-lab-gap]');
    function update(){
      const n=Math.round(10**Number(nInput.value)),gap=Number(gapInput.value);
      const weight=targetWeight(n,gap),percent=(weight*100).toFixed(4)+'%';
      lab.querySelector('[data-lab-n-value]').textContent=n.toLocaleString('zh-CN');
      lab.querySelector('[data-lab-gap-value]').textContent=gap.toFixed(1);
      lab.querySelector('[data-lab-weight]').textContent=percent;
      lab.querySelector('[data-lab-other]').textContent=((1-weight)*100).toFixed(4)+'%';
      lab.querySelector('[data-lab-needed]').textContent=requiredGap(n,.9).toFixed(4);
      lab.querySelector('[data-lab-mass]').style.width=(weight*100)+'%';
      lab.querySelector('[data-lab-equation]').textContent=`1 / (1 + ${n.toLocaleString('zh-CN')} × exp(−${gap.toFixed(1)}))`;
    }
    nInput.addEventListener('input',update);gapInput.addEventListener('input',update);update();
  }
}
