// mn
'use strict';
document.querySelectorAll('.porque-card').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('flipped')));
document.addEventListener('DOMContentLoaded', async () => {
  await loadCatalog();                          // hidrata desde Supabase si está; si no, queda el fallback
  document.body.classList.add('sheet-ready');

  ProductNav.init();Cart.init();CartButton.init();MaskReveal.init();
  ProductsSection.init();NavScroll.init();ProductModal.init();Carousel3D.init();Checkout.init();

  document.querySelector('.icon-btn[aria-label="Cuenta"]')?.addEventListener('click',()=>{
    const el=document.getElementById('contacto');
    if(el) el.scrollIntoView({behavior:'smooth'});
  });

  const rr=document.getElementById('revealRect');
  if(rr && typeof ScrollTrigger !== 'undefined')
    gsap.fromTo(rr,{attr:{width:0}},{attr:{width:520},ease:'none',scrollTrigger:{trigger:'.csl-title-wrap',start:'top 65%',end:'top -10%',scrub:2}});
});
