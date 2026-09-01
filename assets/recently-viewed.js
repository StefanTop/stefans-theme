(function () {
  const STORAGE_KEY = 'theme:recently_viewed';
  const MAX_STORED = 12;

  function getStoredHandles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function storeHandle(handle) {
    if (!handle) return;
    try {
      let handles = getStoredHandles().filter((existing) => existing !== handle);
      handles.unshift(handle);
      handles = handles.slice(0, MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
    } catch (error) {
      // Storage unavailable (private browsing, quota, etc.) — fail silently.
    }
  }

  if (window.ThemeRecentlyViewed && window.ThemeRecentlyViewed.currentHandle) {
    storeHandle(window.ThemeRecentlyViewed.currentHandle);
  }

  function formatMoney(cents, currencyCode) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency',
        currency: currencyCode,
      }).format(cents / 100);
    } catch (error) {
      return (cents / 100).toFixed(2);
    }
  }

  class RecentlyViewedProducts extends HTMLElement {
    connectedCallback() {
      this.excludeHandle = this.dataset.excludeHandle || '';
      this.max = parseInt(this.dataset.max, 10) || 4;
      this.render();
    }

    async render() {
      const handles = getStoredHandles()
        .filter((handle) => handle !== this.excludeHandle)
        .slice(0, this.max);

      if (handles.length === 0) return;

      const currencyCode = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';

      const products = await Promise.all(
        handles.map((handle) =>
          fetch(`/products/${handle}.js`)
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null)
        )
      );

      const validProducts = products.filter(Boolean);
      if (validProducts.length === 0) return;

      const grid = document.createElement('ul');
      grid.className = 'recently-viewed__grid grid grid--3-col-desktop grid--2-col-tablet-down';
      grid.setAttribute('role', 'list');

      validProducts.forEach((product) => {
        const item = document.createElement('li');
        item.className = 'recently-viewed__item grid__item';

        const image = product.featured_image || (product.images && product.images[0]) || '';
        const price = formatMoney(product.price, currencyCode);

        item.innerHTML = `
          <a href="${product.url}" class="recently-viewed__card">
            <span class="recently-viewed__media">
              ${image ? `<img src="${image}" alt="${product.featured_image_alt || product.title}" loading="lazy" width="400" height="400">` : ''}
            </span>
            <span class="recently-viewed__title">${product.title}</span>
            <span class="recently-viewed__price price">${price}</span>
          </a>
        `;
        grid.appendChild(item);
      });

      this.innerHTML = '';
      this.appendChild(grid);
      this.hidden = false;
      const section = this.closest('.recently-viewed-section');
      if (section) section.hidden = false;
    }
  }

  customElements.define('recently-viewed-products', RecentlyViewedProducts);
})();
