/* eslint-disable no-underscore-dangle */
import { readBlockConfig } from '../../scripts/aem.js';
import { performCatalogServiceQuery } from '../../scripts/commerce.js';
import { getConfigValue } from '../../scripts/configs.js';

const isMobile = window.matchMedia('only screen and (max-width: 900px)').matches;

const recommendationsQuery = `query GetRecommendations(
  $pageType: PageType!
  $category: String
  $currentSku: String
  $cartSkus: [String]
  $userPurchaseHistory: [PurchaseHistory]
  $userViewHistory: [ViewHistory]
) {
  recommendations(
    cartSkus: $cartSkus
    category: $category
    currentSku: $currentSku
    pageType: $pageType
    userPurchaseHistory: $userPurchaseHistory
    userViewHistory: $userViewHistory
  ) {
    results {
      displayOrder
      pageType
      productsView {
        name
        sku
        url
        images {
          url
        }
        externalId
        __typename
      }
      storefrontLabel
      totalProducts
      typeId
      unitId
      unitName
    }
    totalResults
  }
}`;

let unitsPromise;

function renderPlaceholder(block) {
  block.innerHTML = `<h2></h2>
  <div class="scrollable">
    <div class="product-grid">
      ${[...Array(5)].map(() => `
        <div class="placeholder">
          <picture><img width="300" height="375" src="" /></picture>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderItem(unitId, product) {
  const urlKey = product.url.split('/').pop().replace('.html', '');
  let image = product.images[0]?.url;
  image = image.replace('http://', '//');

  const clickHandler = () => {
    window.adobeDataLayer.push((dl) => {
      dl.push({ event: 'recs-item-click', eventInfo: { ...dl.getState(), unitId, productId: parseInt(product.externalId, 10) || 0 } });
    });
  };

  const item = document.createRange().createContextualFragment(`<div class="product-grid-item">
    <a href="/products/${urlKey}/${product.sku.toLowerCase()}">
      <picture>
        <source type="image/webp" srcset="${image}?width=300&format=webply&optimize=medium" />
        <img loading="lazy" alt="${product.name}" width="300" height="375" src="${image}?width=300&format=jpg&optimize=medium" />
      </picture>
      <span>${product.name}</span>
    </a>
  </div>`);
  item.querySelector('a').addEventListener('click', clickHandler);

  return item;
}

function renderItems(block, results) {
  // Render only first recommendation
  const [recommendation] = results;
  if (!recommendation) {
    // Hide block content if no recommendations are available
    block.textContent = '';
    return;
  }

  window.adobeDataLayer.push((dl) => {
    dl.push({ event: 'recs-unit-impression-render', eventInfo: { ...dl.getState(), unitId: recommendation.unitId } });
  });

  // Title
  block.querySelector('h2').textContent = recommendation.storefrontLabel;

  // Grid
  const grid = block.querySelector('.product-grid');
  grid.innerHTML = '';
  const { productsView } = recommendation;
  productsView.forEach((product) => {
    grid.appendChild(renderItem(recommendation.unitId, product));
  });

  const inViewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        window.adobeDataLayer.push((dl) => {
          dl.push({ event: 'recs-unit-view', eventInfo: { ...dl.getState(), unitId: recommendation.unitId } });
        });
        inViewObserver.disconnect();
      }
    });
  });
  inViewObserver.observe(block);
}

const mapUnit = (unit) => ({
  ...unit,
  unitType: 'primary',
  searchTime: 0,
  primaryProducts: unit.totalProducts,
  backupProducts: 0,
  products: unit.productsView.map((product, index) => ({
    ...product,
    rank: index,
    score: 0,
    productId: parseInt(product.externalId, 10) || 0,
    type: '?',
    queryType: product.__typename,
  })),
});

async function loadRecommendation(block, context, visibility, filters) {
  // Only load once the recommendation becomes visible
  if (!visibility) {
    return;
  }

  // Only proceed if all required data is available
  if (!context.pageType
    || (context.pageType === 'Product' && !context.currentSku)
    || (context.pageType === 'Category' && !context.category)
    || (context.pageType === 'Cart' && !context.cartSkus)) {
    return;
  }

  if (!unitsPromise) {
    const storeViewCode = await getConfigValue('commerce-store-view-code');
    // Get product view history
    try {
      const viewHistory = window.localStorage.getItem(`${storeViewCode}:productViewHistory`) || '[]';
      context.userViewHistory = JSON.parse(viewHistory);
    } catch (e) {
      window.localStorage.removeItem('productViewHistory');
      console.error('Error parsing product view history', e);
    }

    // Get purchase history
    try {
      const purchaseHistory = window.localStorage.getItem(`${storeViewCode}:purchaseHistory`) || '[]';
      context.userPurchaseHistory = JSON.parse(purchaseHistory);
    } catch (e) {
      window.localStorage.removeItem('purchaseHistory');
      console.error('Error parsing purchase history', e);
    }

    window.adobeDataLayer.push((dl) => {
      dl.push({ event: 'recs-api-request-sent', eventInfo: { ...dl.getState() } });
    });

    unitsPromise = performCatalogServiceQuery(recommendationsQuery, context);
    const { recommendations } = await unitsPromise;

    window.adobeDataLayer.push((dl) => {
      dl.push({ recommendationsContext: { units: recommendations.results.map(mapUnit) } });
      dl.push({ event: 'recs-api-response-received', eventInfo: { ...dl.getState() } });
    });
  }

  let { results } = (await unitsPromise).recommendations;
  results = results.filter((unit) => (filters.typeId ? unit.typeId === filters.typeId : true));

  renderItems(block, results);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const filters = {};
  if (config.typeid) {
    filters.typeId = config.typeid;
  }
  renderPlaceholder(block);

  const context = {};
  let visibility = !isMobile;

  function handleProductChanges({ productContext }) {
    context.currentSku = productContext?.sku;
    loadRecommendation(block, context, visibility, filters);
  }

  function handleCategoryChanges({ categoryContext }) {
    context.category = categoryContext?.name;
    loadRecommendation(block, context, visibility, filters);
  }

  function handlePageTypeChanges({ pageContext }) {
    context.pageType = pageContext?.pageType;
    loadRecommendation(block, context, visibility, filters);
  }

  function handleCartChanges({ shoppingCartContext }) {
    context.cartSkus = shoppingCartContext?.items?.map(({ product }) => product.sku);
    loadRecommendation(block, context, visibility, filters);
  }

  window.adobeDataLayer.push((dl) => {
    dl.addEventListener('adobeDataLayer:change', handlePageTypeChanges, { path: 'pageContext' });
    dl.addEventListener('adobeDataLayer:change', handleProductChanges, { path: 'productContext' });
    dl.addEventListener('adobeDataLayer:change', handleCategoryChanges, { path: 'categoryContext' });
    dl.addEventListener('adobeDataLayer:change', handleCartChanges, { path: 'shoppingCartContext' });
  });

  if (isMobile) {
    const section = block.closest('.section');
    const inViewObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibility = true;
          loadRecommendation(block, context, visibility, filters);
          inViewObserver.disconnect();
        }
      });
    });
    inViewObserver.observe(section);
  }
}
