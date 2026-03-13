/* =============================================
   LISORA THEME - Main JavaScript
   ============================================= */

'use strict';

// ============ CART STATE ============
const LisoraCart = {
  items: [],

  async get() {
    const res = await fetch('/cart.js');
    return res.json();
  },

  async add(formData) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.description || 'Erreur ajout panier');
    }
    return res.json();
  },

  async update(updates) {
    const res = await fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    return res.json();
  },

  async change(line, quantity) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line, quantity })
    });
    return res.json();
  }
};

// ============ TOAST NOTIFICATIONS ============
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'default', icon = null) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const defaultIcons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>'
    };

    toast.innerHTML = `${icon || defaultIcons[type] || defaultIcons.default}<span>${message}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
};

// ============ CART DRAWER ============
const CartDrawer = {
  drawer: null,
  overlay: null,

  init() {
    this.drawer = document.getElementById('cart-drawer');
    this.overlay = document.getElementById('cart-overlay');

    document.querySelectorAll('[data-cart-trigger]').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    const closeBtn = this.drawer?.querySelector('[data-cart-close]');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });

    this.bindItemEvents();
  },

  async open() {
    await this.refresh();
    this.drawer?.classList.add('is-open');
    this.overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    this.drawer?.querySelector('[data-cart-close]')?.focus();
  },

  close() {
    this.drawer?.classList.remove('is-open');
    this.overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
  },

  async refresh() {
    const cart = await LisoraCart.get();
    this.updateCount(cart.item_count);
    this.renderItems(cart);
    this.updateTotals(cart);
  },

  updateCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.dataset.count = count;
    });
  },

  renderItems(cart) {
    const body = this.drawer?.querySelector('[data-cart-items]');
    const empty = this.drawer?.querySelector('[data-cart-empty]');
    const footer = this.drawer?.querySelector('[data-cart-footer]');

    if (!body) return;

    if (cart.item_count === 0) {
      body.innerHTML = '';
      empty?.style.setProperty('display', 'flex');
      if (footer) footer.style.display = 'none';
      return;
    }

    empty?.style.setProperty('display', 'none');
    if (footer) footer.style.display = 'block';

    body.innerHTML = cart.items.map((item, index) => `
      <div class="cart-item" data-line="${index + 1}">
        <div class="cart-item__image">
          ${item.image ? `<img src="${item.image}" alt="${item.title}" loading="lazy">` : ''}
        </div>
        <div>
          <div class="cart-item__title">${item.product_title}</div>
          ${item.variant_title ? `<div class="cart-item__variant">${item.variant_title}</div>` : ''}
          <div class="cart-item__quantity">
            <button class="cart-item__qty-btn" data-action="decrease" aria-label="Diminuer">−</button>
            <span class="cart-item__qty-num">${item.quantity}</span>
            <button class="cart-item__qty-btn" data-action="increase" aria-label="Augmenter">+</button>
          </div>
          <button class="cart-item__remove" data-action="remove">Supprimer</button>
        </div>
        <div class="cart-item__price">${this.formatMoney(item.line_price)}</div>
      </div>
    `).join('');

    this.bindItemEvents();
  },

  updateTotals(cart) {
    const totalEl = this.drawer?.querySelector('[data-cart-total]');
    if (totalEl) totalEl.textContent = this.formatMoney(cart.total_price);

    const subtotalEl = this.drawer?.querySelector('[data-cart-subtotal]');
    if (subtotalEl) subtotalEl.textContent = this.formatMoney(cart.total_price);
  },

  bindItemEvents() {
    this.drawer?.querySelectorAll('.cart-item').forEach(item => {
      const line = parseInt(item.dataset.line);

      item.querySelector('[data-action="increase"]')?.addEventListener('click', async () => {
        const qty = parseInt(item.querySelector('.cart-item__qty-num').textContent) + 1;
        await LisoraCart.change(line, qty);
        await this.refresh();
      });

      item.querySelector('[data-action="decrease"]')?.addEventListener('click', async () => {
        const qty = Math.max(0, parseInt(item.querySelector('.cart-item__qty-num').textContent) - 1);
        await LisoraCart.change(line, qty);
        await this.refresh();
      });

      item.querySelector('[data-action="remove"]')?.addEventListener('click', async () => {
        await LisoraCart.change(line, 0);
        await this.refresh();
        Toast.show('Article retiré du panier', 'default');
      });
    });
  },

  formatMoney(cents) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }
};

// ============ PRODUCT FORM ============
const ProductForm = {
  init() {
    const form = document.querySelector('[data-product-form]');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[data-add-to-cart]');
      const originalHtml = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner"></span>';

      const formData = new FormData(form);
      const data = {
        id: formData.get('id'),
        quantity: parseInt(formData.get('quantity')) || 1
      };

      try {
        await LisoraCart.add(data);
        await CartDrawer.refresh();
        CartDrawer.open();
        Toast.show('Ajouté au panier !', 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    // Quantity controls
    const qtyMinus = form.querySelector('[data-qty-minus]');
    const qtyPlus = form.querySelector('[data-qty-plus]');
    const qtyInput = form.querySelector('[name="quantity"]');

    qtyMinus?.addEventListener('click', () => {
      const val = parseInt(qtyInput.value);
      if (val > 1) qtyInput.value = val - 1;
    });
    qtyPlus?.addEventListener('click', () => {
      qtyInput.value = parseInt(qtyInput.value) + 1;
    });
  }
};

// ============ VARIANT SELECTOR ============
const VariantSelector = {
  init() {
    document.querySelectorAll('[data-variant-select]').forEach(select => {
      select.addEventListener('change', () => this.onVariantChange());
    });

    document.querySelectorAll('[data-color-swatch]').forEach(swatch => {
      swatch.addEventListener('click', (e) => this.onSwatchClick(e.currentTarget));
    });
  },

  onSwatchClick(swatch) {
    const optionName = swatch.closest('[data-option]')?.dataset.option;
    const value = swatch.dataset.value;

    swatch.closest('[data-option]')?.querySelectorAll('[data-color-swatch]').forEach(s => {
      s.classList.toggle('is-active', s === swatch);
    });

    // Update selected label
    const label = swatch.closest('.color-swatches')?.querySelector('.color-swatches__selected');
    if (label) label.textContent = value;

    // Sync hidden select
    const select = document.querySelector(`[data-variant-select][data-option="${optionName}"]`);
    if (select) {
      select.value = value;
      select.dispatchEvent(new Event('change'));
    }

    this.onVariantChange();
  },

  onVariantChange() {
    const productData = window.__LISORA_PRODUCT__;
    if (!productData) return;

    const selectedOptions = [];
    document.querySelectorAll('[data-variant-select]').forEach(select => {
      selectedOptions.push(select.value);
    });

    const variant = productData.variants.find(v =>
      v.options.every((opt, i) => opt === selectedOptions[i])
    );

    if (!variant) return;

    // Update hidden variant input
    const variantInput = document.querySelector('[name="id"]');
    if (variantInput) variantInput.value = variant.id;

    // Update price
    const priceEl = document.querySelector('[data-product-price]');
    if (priceEl && variant.price) {
      priceEl.textContent = this.formatMoney(variant.price);
    }

    // Update compare price
    const compareEl = document.querySelector('[data-compare-price]');
    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.textContent = this.formatMoney(variant.compare_at_price);
        compareEl.style.display = '';
      } else {
        compareEl.style.display = 'none';
      }
    }

    // Update availability
    const addBtn = document.querySelector('[data-add-to-cart]');
    if (addBtn) {
      if (!variant.available) {
        addBtn.disabled = true;
        addBtn.textContent = 'Rupture de stock';
      } else {
        addBtn.disabled = false;
        addBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Ajouter au panier
        `;
      }
    }

    // Update gallery if variant has image
    if (variant.featured_image) {
      const mainImg = document.querySelector('[data-gallery-main] img');
      if (mainImg) {
        mainImg.src = variant.featured_image.src;
        mainImg.srcset = '';
      }
    }

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);
  },

  formatMoney(cents) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }
};

// ============ PRODUCT GALLERY ============
const ProductGallery = {
  init() {
    const thumbs = document.querySelectorAll('[data-gallery-thumb]');
    const mainImg = document.querySelector('[data-gallery-main] img');

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
        if (mainImg) {
          mainImg.src = thumb.dataset.src;
          mainImg.alt = thumb.dataset.alt || '';
        }
      });
    });
  }
};

// ============ HEADER ============
const Header = {
  init() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scroll = window.scrollY;
      header.classList.toggle('scrolled', scroll > 20);
      lastScroll = scroll;
    }, { passive: true });

    // Mobile menu
    const menuBtn = document.querySelector('[data-mobile-menu]');
    const menu = document.querySelector('.mobile-menu');
    const closeBtn = menu?.querySelector('[data-mobile-close]');

    menuBtn?.addEventListener('click', () => {
      menu?.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });

    closeBtn?.addEventListener('click', () => {
      menu?.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  }
};

// ============ SCROLL TO TOP ============
const ScrollToTop = {
  init() {
    const btn = document.querySelector('.scroll-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('is-visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
};

// ============ ANIMATE ON SCROLL ============
const AnimateOnScroll = {
  observer: null,

  init() {
    const elements = document.querySelectorAll('[data-aos]');
    if (!elements.length) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-animate');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      el.style.transitionDelay = el.dataset.aosDelay || '0ms';
      this.observer.observe(el);
    });

    document.addEventListener('aos-animate', (e) => {
      e.target.style.opacity = '1';
      e.target.style.transform = 'none';
    });
  }
};

// Add AOS animate class handler
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-aos]').forEach(el => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
  });
});

// ============ NEWSLETTER ============
const Newsletter = {
  init() {
    const form = document.querySelector('[data-newsletter-form]');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('[name="contact[email]"]').value;
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;

      btn.disabled = true;
      btn.textContent = '...';

      try {
        const formData = new FormData(form);
        await fetch(form.action, { method: 'POST', body: formData });
        Toast.show('Merci pour votre inscription !', 'success');
        form.reset();
      } catch {
        Toast.show('Une erreur est survenue.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }
};

// ============ STICKY ADD TO CART ============
const StickyATC = {
  init() {
    const productForm = document.querySelector('[data-product-form]');
    const stickyBar = document.querySelector('[data-sticky-atc]');
    if (!productForm || !stickyBar) return;

    const observer = new IntersectionObserver(([entry]) => {
      stickyBar.classList.toggle('is-visible', !entry.isIntersecting);
    }, { threshold: 0 });

    observer.observe(productForm);

    stickyBar.querySelector('button')?.addEventListener('click', () => {
      productForm.querySelector('[data-add-to-cart]')?.click();
    });
  }
};

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  CartDrawer.init();
  Header.init();
  ProductForm.init();
  VariantSelector.init();
  ProductGallery.init();
  ScrollToTop.init();
  AnimateOnScroll.init();
  Newsletter.init();
  StickyATC.init();
});
