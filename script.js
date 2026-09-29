// TODO: подставить реальную ссылку на Telegram-канал
const TELEGRAM_URL='#';

const modal=document.getElementById('modal'),
      city=document.getElementById('modalCity'),
      text=document.getElementById('modalText'),
      link=document.getElementById('modalLink');
const DEFAULT_TEXT=text.textContent;
link.href=TELEGRAM_URL;
document.querySelectorAll('footer a').forEach(a=>{if(/telegram/i.test(a.textContent))a.href=TELEGRAM_URL});

function closeModal(){modal.classList.remove('show')}
document.querySelectorAll('.notify').forEach(b=>b.addEventListener('click',()=>{
  city.textContent=b.dataset.city;
  text.textContent=b.dataset.text||DEFAULT_TEXT;
  modal.classList.add('show');
}));
document.getElementById('close').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* ---------- плавный скролл + лёгкий параллакс (GSAP ScrollTrigger + Lenis) ---------- */
(function(){
  if(!window.gsap||!window.ScrollTrigger)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  gsap.registerPlugin(ScrollTrigger);

  if(window.Lenis){
    const lenis=new Lenis({lerp:.09,smoothWheel:true});
    lenis.on('scroll',ScrollTrigger.update);
    gsap.ticker.add(t=>lenis.raf(t*1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
      const href=a.getAttribute('href');
      if(href.length<2)return;
      const el=document.querySelector(href);
      if(el){e.preventDefault();lenis.scrollTo(el,{offset:-72})}
    }));
  }

  const scrub=(trigger,extra)=>({trigger,start:'top bottom',end:'bottom top',scrub:true,...extra});

  // hero: видео отстаёт от контента, контент растворяется
  gsap.to('.hero-video',{yPercent:18,ease:'none',scrollTrigger:scrub('.hero',{start:'top top'})});
  gsap.to('.hero-content',{yPercent:-25,opacity:0,ease:'none',scrollTrigger:scrub('.hero',{start:'top top',end:'75% top'})});

  // фото внутри плиток чуть плывут
  gsap.utils.toArray('.tile img,.media img').forEach(img=>{
    gsap.fromTo(img,{yPercent:-8,scale:1.16},{yPercent:8,scale:1.16,ease:'none',scrollTrigger:scrub(img.parentElement)});
  });

  // незаметный параллакс по всему сайту: заголовки секций и карточки едут с разной скоростью
  gsap.utils.toArray('.section-head').forEach(el=>{
    gsap.fromTo(el,{y:24},{y:-24,ease:'none',scrollTrigger:scrub(el.closest('.section'))});
  });
  gsap.utils.toArray('.grid .card, .rail .media').forEach((el,i)=>{
    const d=10+(i%3)*8;
    gsap.fromTo(el,{y:d},{y:-d,ease:'none',scrollTrigger:scrub(el.closest('.section'))});
  });
  gsap.utils.toArray('.about-cols p').forEach((el,i)=>{
    gsap.fromTo(el,{y:16+i*10},{y:-(16+i*10),ease:'none',scrollTrigger:scrub('.about')});
  });

})();
