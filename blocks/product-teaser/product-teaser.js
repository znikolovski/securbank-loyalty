/* eslint-disable dot-notation */
import { readBlockConfig } from '../../scripts/aem.js';
import { performCatalogServiceQuery, renderPrice } from '../../scripts/commerce.js';

const productTeaserQuery = `query productTeaser($sku: String!) {
  products(skus: [$sku]) {
    sku
    urlKey
    name
    shortDescription
    addToCartAllowed
    __typename
    images(roles: ["small_image"]) {
      label
      url
    }
    ... on SimpleProductView {
      price {
        ...priceFields
      }
    }
    ... on ComplexProductView {
      priceRange {
        minimum {
          ...priceFields
        }
        maximum {
          ...priceFields
        }
      }
    }
  }
}
fragment priceFields on ProductViewPrice {
  regular {
    amount {
      currency
      value
    }
  }
  final {
    amount {
      currency
      value
    }
  }
}`;

function renderPlaceholder(config, block) {
  block.textContent = '';
  block.appendChild(document.createRange().createContextualFragment(`
    <div class="image">
      <div class="placeholder"></div>
    </div>
    <div class="details">
      <h1></h1>
      <div class="product-description">
        ${config['description'] !== '' ? config['description'] : ''}
      </div>
      <div class="price"></div>
      <div class="actions">
        ${config['cart-button'] ? '<button class="button-tertiary" disabled>Add to Cart</button>' : ''}
        ${config['details-button'] ? '<a href="#" class="button-primary disabled">View Details</a>' : ''}
      </div>
    </div>
  `));
}

function renderImage(image, size = 250) {
  const { url: imageUrl, label } = image;
  const createUrlForWidth = (url, w, useWebply = true) => {
    const newUrl = new URL(url, window.location);
    if (useWebply) {
      newUrl.searchParams.set('format', 'webply');
      newUrl.searchParams.set('optimize', 'medium');
    } else {
      newUrl.searchParams.delete('format');
    }
    newUrl.searchParams.set('width', w);
    newUrl.searchParams.delete('quality');
    newUrl.searchParams.delete('dpr');
    newUrl.searchParams.delete('bg-color');
    return newUrl.toString();
  };

  const createUrlForDpi = (url, w, useWebply = true) => `${createUrlForWidth(url, w, useWebply)} 1x, ${createUrlForWidth(url, w * 2, useWebply)} 2x, ${createUrlForWidth(url, w * 3, useWebply)} 3x`;

  const webpUrl = createUrlForDpi(imageUrl, size, true);
  const jpgUrl = createUrlForDpi(imageUrl, size, false);

  return document.createRange().createContextualFragment(`<picture>
      <source srcset="${webpUrl}" />
      <source srcset="${jpgUrl}" />
      <img height="${size}" width="${size}" src="${createUrlForWidth(imageUrl, size, false)}" loading="eager" alt="${label}" />
    </picture>
  `);
}

function renderProduct(product, config, block) {
  const {
    name, urlKey, sku, price, shortDescription, priceRange, addToCartAllowed, __typename,
  } = product;

  const currency = price?.final?.amount?.currency || priceRange?.minimum?.final?.amount?.currency;
  const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  block.textContent = '';
  const fragment = document.createRange().createContextualFragment(`
    <div class="image">
    </div>
    <div class="details">
      <h1>${name}</h1>
      <div class="product-description">
        ${shortDescription}
      </div>
      <div class="price">${renderPrice(product, priceFormatter.format)}</div>
      <div class="actions">
        ${config['cart-button'] && addToCartAllowed && (__typename === 'SimpleProductView') ? '<button class="add-to-cart button-tertiary">Add to Cart</button>' : ''}
        ${config['details-button'] ? `<a href="/products/${urlKey}/${sku}" class="button-primary">View Details</a>` : ''}
      </div>
    </div>
  `);

  fragment.querySelector('.image').appendChild(renderImage(product.images[0], 250));

  const addToCartButton = fragment.querySelector('.add-to-cart');
  if (addToCartButton) {
    addToCartButton.addEventListener('click', async () => {
      const values = [{
        optionsUIDs: [],
        quantity: 1,
        sku: product.sku,
      }];
      const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
      // TODO: productId not exposed by catalog service as number
      window.adobeDataLayer.push({ productContext: { productId: 0, ...product } });
      console.debug('onAddToCart', values);
      addProductsToCart(values);
    });
  }

  block.appendChild(fragment);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  config['details-button'] = !!(config['details-button'] || config['details-button'] === 'true');
  config['cart-button'] = !!(config['cart-button'] || config['cart-button'] === 'true');

  renderPlaceholder(config, block);

  const { products } = await performCatalogServiceQuery(productTeaserQuery, {
    sku: config.sku,
  });
  if (!products || !products.length > 0 || !products[0].sku) {
    return;
  }
  const [product] = products;
  product.images = product.images.map((image) => ({ ...image, url: image.url.replace(/^https?:/, '') }));

  renderProduct(product, config, block);
}
