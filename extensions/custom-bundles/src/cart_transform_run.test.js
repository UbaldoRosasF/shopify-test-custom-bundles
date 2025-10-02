import { describe, it, expect } from 'vitest';
import { cartTransformRun } from './cart_transform_run';

/**
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 * @typedef {import("../generated/api").Input} Input
 */

describe('cart transform function', () => {
  it('returns no operations when cart is empty', () => {
    const input = /** @type {Input} */ ({
      cart: {
        lines: []
      }
    });
    
    const result = cartTransformRun(input);
    const expected = /** @type {CartTransformRunResult} */ ({ operations: [] });

    expect(result).toEqual(expected);
  });

  it('returns no operations when no bundle attributes are present', () => {
    const input = /** @type {Input} */ ({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            bundle_key: null,
            bundle_components: null,
            bundle_discount: null,
            bundle_name: null
          }
        ]
      }
    });
    
    const result = cartTransformRun(input);
    const expected = /** @type {CartTransformRunResult} */ ({ operations: [] });

    expect(result).toEqual(expected);
  });

  it('expands bundle into components with discount applied', () => {
    const input = /** @type {Input} */ ({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            bundle_key: { value: "bundle-123" },
            bundle_components: { 
              value: JSON.stringify([
                {
                  variantId: "gid://shopify/ProductVariant/1",
                  quantity: 2,
                  price: "25.00"
                },
                {
                  variantId: "gid://shopify/ProductVariant/2", 
                  quantity: 1,
                  price: "50.00"
                }
              ])
            },
            bundle_discount: { value: "20" },
            bundle_name: { value: "Mi Bundle Especial" }
          }
        ]
      }
    });
    
    const result = cartTransformRun(input);
    
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toHaveProperty('lineExpand');
    
    const lineExpand = result.operations[0].lineExpand;
    expect(lineExpand.cartLineId).toBe("gid://shopify/CartLine/1");
    expect(lineExpand.title).toBe("Mi Bundle Especial");
    expect(lineExpand.expandedCartItems).toHaveLength(2);
    
    // Verificar que se aplicó el descuento del 20%
    const firstItem = lineExpand.expandedCartItems[0];
    expect(firstItem.merchandiseId).toBe("gid://shopify/ProductVariant/1");
    expect(firstItem.quantity).toBe(2);
    expect(firstItem.price.adjustment.fixedPricePerUnit.amount).toBe("20.00"); // 25 * 0.8 = 20
    
    const secondItem = lineExpand.expandedCartItems[1];
    expect(secondItem.merchandiseId).toBe("gid://shopify/ProductVariant/2");
    expect(secondItem.quantity).toBe(1);
    expect(secondItem.price.adjustment.fixedPricePerUnit.amount).toBe("40.00"); // 50 * 0.8 = 40
  });

  it('handles multiple bundles in cart', () => {
    const input = /** @type {Input} */ ({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            bundle_key: { value: "bundle-1" },
            bundle_components: { 
              value: JSON.stringify([
                {
                  variantId: "gid://shopify/ProductVariant/1",
                  quantity: 1,
                  price: "10.00"
                }
              ])
            },
            bundle_discount: { value: "10" },
            bundle_name: { value: "Bundle Pequeño" }
          },
          {
            id: "gid://shopify/CartLine/2",
            bundle_key: { value: "bundle-2" },
            bundle_components: { 
              value: JSON.stringify([
                {
                  variantId: "gid://shopify/ProductVariant/2",
                  quantity: 1,
                  price: "20.00"
                }
              ])
            },
            bundle_discount: { value: "15" },
            bundle_name: { value: "Bundle Grande" }
          }
        ]
      }
    });
    
    const result = cartTransformRun(input);
    
    expect(result.operations).toHaveLength(2);
    
    // Verificar primer bundle (10% descuento)
    const firstExpand = result.operations[0].lineExpand;
    expect(firstExpand.title).toBe("Bundle Pequeño");
    expect(firstExpand.expandedCartItems[0].price.adjustment.fixedPricePerUnit.amount).toBe("9.00"); // 10 * 0.9 = 9
    
    // Verificar segundo bundle (15% descuento)
    const secondExpand = result.operations[1].lineExpand;
    expect(secondExpand.title).toBe("Bundle Grande");
    expect(secondExpand.expandedCartItems[0].price.adjustment.fixedPricePerUnit.amount).toBe("17.00"); // 20 * 0.85 = 17
  });

  it('handles mixed cart with bundles and regular items', () => {
    const input = /** @type {Input} */ ({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            bundle_key: { value: "bundle-123" },
            bundle_components: { 
              value: JSON.stringify([
                {
                  variantId: "gid://shopify/ProductVariant/1",
                  quantity: 1,
                  price: "30.00"
                }
              ])
            },
            bundle_discount: { value: "25" },
            bundle_name: { value: "Bundle con Descuento" }
          },
          {
            id: "gid://shopify/CartLine/2",
            bundle_key: null,
            bundle_components: null,
            bundle_discount: null,
            bundle_name: null
          }
        ]
      }
    });
    
    const result = cartTransformRun(input);
    
    // Solo debe expandir el bundle, no el item regular
    expect(result.operations).toHaveLength(1);
    
    const lineExpand = result.operations[0].lineExpand;
    expect(lineExpand.title).toBe("Bundle con Descuento");
    expect(lineExpand.expandedCartItems[0].price.adjustment.fixedPricePerUnit.amount).toBe("22.50"); // 30 * 0.75 = 22.5
  });
});