// sd
'use strict';
const HERO_STOCK = {};
// ── FALLBACK hardcodeado ──────────────────────────────────────────────────
// Si Supabase no está configurado o falla, la web usa estos datos y NO se
// rompe. loadCatalog() los sobreescribe cuando Supabase responde.
let PRODUCTS=[
  {id:1,key:'airpods-pro-2',name:'AirPods Pro 2',price:'$14.000',rawPrice:14000,image:'images/airpods.webp',bgLabel:'AIRPODS PRO 2',scale:1,offsetX:0,offsetY:0},
  {id:2,key:'airpods-4',name:'AirPods 4',price:'$15.000',rawPrice:15000,image:'images/airpods4.webp',bgLabel:'AIRPODS 4',scale:0.8,offsetX:0,offsetY:0},
  {id:3,key:'airpods-max',name:'AirPods Max',price:'$26.990',rawPrice:26990,image:'images/airpodsmax.webp',bgLabel:'AIRPODS MAX',scale:1.4,offsetX:50,offsetY:-20},
];
const PRICE_TIERS={
  'apple-watch-ultra-3':[{qty:1,price:29990},{qty:3,price:27990},{qty:5,price:25990},{qty:10,price:23990}],
  'apple-watch-serie-10':[{qty:1,price:29990},{qty:3,price:27990},{qty:5,price:25990},{qty:10,price:23990}],
  'apple-watch-black-ultra-2':[{qty:1,price:29990},{qty:3,price:27990},{qty:5,price:25990},{qty:10,price:23990}],
  'airpods-4':[{qty:1,price:15000},{qty:3,price:13500},{qty:5,price:12500},{qty:10,price:11500}],
  'airpods-pro-2':[{qty:1,price:14000},{qty:3,price:12500},{qty:5,price:11500},{qty:10,price:10500}],
  'airpods-3':[{qty:1,price:14000},{qty:3,price:12500},{qty:5,price:11500},{qty:10,price:10500}],
  'bateria-magsafe':[{qty:1,price:13000},{qty:3,price:11500},{qty:5,price:10500},{qty:10,price:9500}],
  'airpods-max':[{qty:1,price:26990},{qty:3,price:24990},{qty:5,price:22990},{qty:10,price:20990}],
  'cargador-lightning':[{qty:1,price:5000},{qty:3,price:4500},{qty:5,price:4000},{qty:10,price:3500}],
  'cargador-tipo-c':[{qty:1,price:5000},{qty:3,price:4500},{qty:5,price:4000},{qty:10,price:3500}],
  'cargador-samsung-45w':[{qty:1,price:6000},{qty:3,price:5500},{qty:5,price:5000},{qty:10,price:4500}],
};
const getUnitPrice=(key,qty)=>{const t=PRICE_TIERS[key];if(!t||!t.length)return 0;let p=t[0].price;for(const r of t)if(qty>=r.qty)p=r.price;return p;};

function fmt(n){ return '$'+n.toLocaleString('es-CL'); }

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[áä]/g, 'a')
    .replace(/[éë]/g, 'e')
    .replace(/[íï]/g, 'i')
    .replace(/[óö]/g, 'o')
    .replace(/[úü]/g, 'u')
    .replace(/[^a-z0-9-]/g, '');
}

// ── Catálogo desde Supabase + render dinámico ──────────────────────────────
function escAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

function colorDots(slug){
  const cv=(typeof COLOR_VARIANTS!=='undefined')?COLOR_VARIANTS[slug]:null;
  if(!cv)return '';
  return '<div class="card-colors">'+cv.map(v=>`<span class="card-color-dot">${v.swatch?`<img src="${escAttr(v.swatch)}" alt="${escAttr(v.name)}">`:`<span style="display:block;width:100%;height:100%;border-radius:50%;background:${v.hex}"></span>`}</span>`).join('')+'</div>';
}

function tierOne(slug){
  const t = PRICE_TIERS[slug] || [];
  return (t.find(x => x.qty === 1) || t[0] || {}).price || 0;
}

function cardHTML(p){
  const p1 = tierOne(p.slug);
  const out = p.in_stock === false ? ' out-of-stock' : '';
  const dis = p.in_stock === false ? ' aria-disabled="true"' : '';
  const btn = p.in_stock === false ? 'SIN STOCK' : 'Ver más';
  return `<div class="product-card${out}" data-id="${escAttr(p.slug)}" data-name="${escAttr(p.name)}" data-price="${p1}" data-raw="${p1}" data-img-scale="${p.image_scale ?? 0.75}" data-desc="${escAttr(p.description)}"${dis}>
      <div class="card-img-wrap"><img src="${escAttr(p.image)}" alt="${escAttr(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><svg class="card-img-placeholder" style="display:none" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>
      <div class="card-info"><p class="card-name">${escAttr(p.name)}</p><p class="card-price">${fmt(p1)} <span class="card-unit">c/u</span></p>${colorDots(p.slug)}<button class="card-btn">${btn}</button></div>
    </div>`;
}

function slideHTML(p,i){
  const p1 = tierOne(p.slug);
  // Mismo nombre e imagen que el producto → grilla y carrusel quedan conectados.
  const name = p.name;
  const img  = p.image;
  const tag  = p.featured_tag || 'Destacado';   // etiqueta opcional del carrusel
  const out = p.in_stock === false ? ' out-of-stock' : '';
  const dis = p.in_stock === false ? ' aria-disabled="true"' : '';
  const btn = p.in_stock === false ? 'SIN STOCK' : 'Ver más';
  const mid = 'mfx' + i;
  return `<div class="swiper-slide csl-slide${out}" data-id="${escAttr(p.slug)}" data-name="${escAttr(name)}" data-price="${p1}" data-raw="${p1}" data-img-scale="${p.image_scale ?? 0.75}" data-desc="${escAttr(p.description)}"${dis}>
      <div class="csl-corner"><svg width="31" height="31" viewBox="0 0 31 31" fill="none"><g opacity="0.35"><mask id="${mid}" fill="white"><path d="M30.6 1L1.6 0L0.7 29L29.7 30L30.6 1Z"/></mask><path d="M30.6 1L30.65 -0.47L32.2 -0.42L32.15 1.09L30.6 1ZM30.55 2.55L1.6 1.59L1.7 -1.43L30.65 -0.47L30.55 2.55ZM28.17 29.98L29.13 0.99L32.15 1.09L31.19 30.08L28.17 29.98Z" fill="white" mask="url(#${mid})"/></g></svg></div>
      <span class="csl-tag">${escAttr(tag)}</span>
      <div class="csl-img"><img src="${escAttr(img)}" alt="${escAttr(name)}" loading="lazy"></div>
      <h3 class="csl-name">${escAttr(name)}</h3>
      <span class="csl-price">${fmt(p1)}</span>
      <button class="csl-rect">${btn}</button>
    </div>`;
}

async function loadCatalog(){
  if (!window.sb) return false;   // Supabase no configurado → se queda el fallback
  try {
    const { data, error } = await window.sb
      .from('products')
      .select('*, price_tiers(qty,price,active)')
      .order('position', { ascending: true });
    if (error) throw error;
    const products = data || [];
    if (!products.length) return false;   // sin datos → se queda el fallback

    // PRICE_TIERS + FEATURES por slug (solo tramos activos con precio > 0)
    products.forEach(p => {
      const tiers = (p.price_tiers || [])
        .filter(t => t.active !== false && t.price > 0)
        .sort((a,b)=>a.qty-b.qty)
        .map(t=>({ qty:t.qty, price:t.price }));
      if (tiers.length) PRICE_TIERS[p.slug] = tiers;
      FEATURES[p.slug] = p.features || [];
      // imágenes del detalle = principal + secundarias (galería)
      GALLERY[p.slug] = [p.image, ...(p.gallery || [])].filter(Boolean);
    });

    // HERO (carrusel principal)
    PRODUCTS.length = 0;
    products.filter(p => p.is_hero)
      .sort((a,b)=>(a.hero_order||0)-(b.hero_order||0))
      .forEach((p, idx) => {
        const p1 = tierOne(p.slug);
        const heroName = p.hero_name || p.name;
        PRODUCTS.push({
          id: idx + 1, key: p.slug, name: heroName,
          price: fmt(p1), rawPrice: p1, image: p.hero_image || p.image,
          bgLabel: p.hero_bg_label || (p.name || '').toUpperCase(),
          scale: p.hero_scale ?? 1, offsetX: p.hero_offset_x ?? 0, offsetY: p.hero_offset_y ?? 0,
        });
        HERO_STOCK[heroName] = p.in_stock !== false;
      });

    // Grilla de productos
    const grid = document.getElementById('productosGrid');
    if (grid) grid.innerHTML = products.map(cardHTML).join('');

    // Carrusel destacados
    const wrap = document.querySelector('.csl-swiper .swiper-wrapper');
    if (wrap) {
      const feats = products.filter(p => p.is_featured)
        .sort((a,b)=>(a.featured_order||0)-(b.featured_order||0));
      wrap.innerHTML = feats.map(slideHTML).join('');
    }

    document.body.classList.add('sheet-ready');
    return PRODUCTS.length > 0;
  } catch (err) {
    console.error('❗ No se pudo cargar el catálogo desde Supabase:', err);
    document.body.classList.add('sheet-ready');
    return false;
  }
}


const FEATURES={
  'airpods-pro-2':['Cancelación activa de ruido','Audio espacial personalizado','Hasta 30 horas de batería','Resistencia al agua IPX4'],
  'airpods-4':['Audio adaptativo','Cancelación activa de ruido','Diseño rediseñado','Hasta 30 horas con estuche'],
  'airpods-3':['Audio espacial','Resistencia al agua IPX4','Carga MagSafe','Hasta 30 horas con estuche'],
  'apple-watch-ultra-3':['Caja de titanio aeroespacial','Pantalla Always-On 49mm','Hasta 60 horas de batería','GPS de doble frecuencia'],
  'apple-watch-serie-10':['Pantalla OLED más grande','Detección de apnea del sueño','Carga rápida','Diseño más delgado'],
  'apple-watch-black-ultra-2':['Acabado negro carbón','Titanio negro premium','Cristal de zafiro','Hasta 60 horas de batería'],
  'bateria-magsafe':['Carga magnética MagSafe','Compacta y liviana','Compatible iPhone 12 en adelante','Sin cables'],
  'airpods-max':['Compatibles con MagSafe','Fijación magnética perfecta','Carga inalámbrica optimizada','Múltiples colores'],
  'cargador-lightning':['Cable Lightning incluido','Adaptador de corriente','Compatible iPhone/iPad/AirPods','Carga rápida'],
  'cargador-tipo-c':['Cable USB-C incluido','Compatible iPhone 15+','iPad Pro y MacBook','Carga rápida 20W'],
  'cargador-samsung-45w':['Carga ultra rápida 45W','Compatible línea Galaxy','Cable USB-C incluido','Carga completa en ~1 hora'],
};            // fallback — loadCatalog() lo sobreescribe desde Supabase
// { slug: [imgPrincipal, ...secundarias] } — desde Supabase (vacío = usa fallback hardcodeado)
const GALLERY={};
// Variantes de color — SOLO los slugs listados acá muestran colores (dots + selector + validación).
const COLOR_VARIANTS={
  'airpods-max':[
    {name:'Midnight', hex:'#1A1A1A', img:'images/max-negros.webp',  swatch:'images/black.webp'},
    {name:'Starlight',hex:'#F5F0E8', img:'images/max-blanco.webp',  swatch:'images/mstarlight.webp'},
    {name:'Orange',   hex:'#F26513', img:'images/max-naranja.webp', swatch:'images/orange.webp'},
    {name:'Purple',   hex:'#9B59B6', img:'images/max-morado.webp',  swatch:'images/purple.webp'},
    {name:'Blue',     hex:'#3498DB', img:'images/max-azul.webp',    swatch:'images/blue.webp'},
  ],
};
const PRODUCT_CONFIG={
  1:{fontSize:'22vw',productScale:1.1,productY:-15,blobYRatio:0.88,blobSpeed:0.030},
  2:{fontSize:'28vw',productScale:1.1,productY:-10,blobYRatio:0.88,blobSpeed:0.030},
  3:{fontSize:'24vw',productScale:1.1,productY:-20,blobYRatio:0.90,blobSpeed:0.030},
};
const state={current:0,isTransitioning:false,cart:[]};
const DOM={
  productImg:document.getElementById('productImg'),productWrap:document.getElementById('productWrap'),
  bgText:document.getElementById('bgText'),bgTextBlue:document.getElementById('bgTextBlue'),
  bgTextZoom:document.getElementById('bgTextZoom'),bgTextBlueWrap:document.getElementById('bgTextBlueWrap'),
  bgTextPerspective:document.querySelector('.bg-text-perspective'),priceBlock:document.querySelector('.price-block'),
  productPrice:document.getElementById('productPrice'),prevBtn:document.getElementById('prevBtn'),
  nextBtn:document.getElementById('nextBtn'),dotsWrap:document.getElementById('dots'),
  addToCart:document.getElementById('addToCart'),cartDrawer:document.getElementById('cartDrawer'),
  cartOverlay:document.getElementById('cartOverlay'),cartItems:document.getElementById('cartItems'),
  cartFooter:document.getElementById('cartFooter'),cartTotal:document.getElementById('cartTotal'),
  cartCount:document.getElementById('cartCount'),closeCart:document.getElementById('closeCart'),
  cartTrigger:document.querySelector('.cart-trigger'),
};
