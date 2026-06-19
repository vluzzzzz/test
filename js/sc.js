// sc
'use strict';
const NavScroll=(()=>{function init(){const nav=document.querySelector('.nav');window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>40),{passive:true});}return{init};})();
const ProductsSection=(()=>{
  function init(){
    document.querySelectorAll('.product-card').forEach(c=>c.style.setProperty('--card-img-scale',c.dataset.imgScale??0.75));
    const cards=document.querySelectorAll('.product-card');if(!cards.length)return;
    gsap.set(cards,{opacity:0,y:40});
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){const c=e.target,i=Array.from(cards).indexOf(c);gsap.to(c,{opacity:1,y:0,duration:.65,ease:'power3.out',delay:(i%4)*.08});obs.unobserve(c);}});},{threshold:0.1});
    cards.forEach(c=>obs.observe(c));
  }
  return{init};
})();
const Carousel3D=(()=>{
  function init(){
    if(typeof Swiper==='undefined')return;
    const sw=new Swiper('.csl-swiper',{effect:'coverflow',grabCursor:true,centeredSlides:true,slidesPerView:'auto',loop:false,initialSlide:2,mousewheel:{forceToAxis:true},keyboard:{enabled:true,onlyInViewport:true},coverflowEffect:{rotate:50,stretch:0,depth:50,modifier:1,slideShadows:false},navigation:{prevEl:'.csl-arr-prev',nextEl:'.csl-arr-next'},pagination:{el:'.csl-pagination',clickable:true}});
    const slides=document.querySelectorAll('.csl-swiper .swiper-slide');
    gsap.set(slides,{opacity:0,y:50});
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){gsap.to([...slides],{opacity:1,y:0,duration:.7,ease:'power3.out',stagger:.08});obs.disconnect();}});},{threshold:.2});
    obs.observe(document.querySelector('.csl-swiper'));
    let drag=false,pend=null;
    sw.on('sliderMove',()=>{drag=true;});sw.on('touchStart',()=>{drag=false;});
    sw.on('slideChangeTransitionEnd',()=>{if(pend!==null&&!pend.classList.contains('out-of-stock')){const s=pend;pend=null;ProductModal.open(s);}else{pend=null;}});
    document.querySelectorAll('.csl-swiper .swiper-slide[data-name]').forEach((slide,i)=>{
      slide.addEventListener('click',()=>{if(drag||slide.classList.contains('out-of-stock'))return;if(!slide.classList.contains('swiper-slide-active')){pend=slide;sw.slideTo(i);return;}ProductModal.open(slide);});
    });
  }
  return{init};
})();
