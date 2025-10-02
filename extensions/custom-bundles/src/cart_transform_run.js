// src/cartTransformRun.js

/**
 * @typedef {import("../generated/api").Input} Input
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * @type {CartTransformRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {Input} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const operations = input.cart.lines.reduce(
    /** @param {Operation[]} acc */
    (acc, cartLine) => {
      // Detecta si es un bundle por la property "bundle_key"
      const bundleKey = cartLine.bundle_key?.value;
      const bundleComponents = cartLine.bundle_components?.value;
      const bundleDiscountPct = cartLine.bundle_discount?.value;
      const bundleName = cartLine.bundle_name?.value;

        // Expande el bundle en sus componentes y aplica el descuento por porcentaje
        const components = JSON.parse(bundleComponents);
        const discountPct = parseFloat(bundleDiscountPct); // Ejemplo: 20 para 20%

        const expandedCartItems = components.map((component) => {
          const originalPrice = parseFloat(component.price);
          const discountedPrice = (originalPrice * (1 - discountPct / 100)).toFixed(2);
          return {
            merchandiseId: component.variantId,
            quantity: component.quantity,
            price: {
              adjustment: {
                fixedPricePerUnit: {
                  amount: discountedPrice,
                },
              },
            },
          };
        });

        return [
          ...acc,
          {
            lineExpand: {
              cartLineId: cartLine.id,
              expandedCartItems,
              title: bundleName,
              image: null,
              price: null,
            },
          },
        ];
    },
    []
  );

  return operations.length > 0 ? { operations } : NO_CHANGES;
}
