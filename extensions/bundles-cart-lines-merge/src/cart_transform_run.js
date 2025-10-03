// src/cart_transform_run.js

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * @type {CartTransformRunResult}
 */
const NO_CHANGES = { operations: [] };

/**
 * @param {RunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  // Group lines by bundle_key
  const bundleGroups = {};
  for (const line of input.cart.lines) {
    const bundleKey = line.bundle_key?.value;
    if (!bundleKey) continue;
    if (!bundleGroups[bundleKey]) bundleGroups[bundleKey] = [];
    bundleGroups[bundleKey].push(line);
  }

  const operations = [];

  for (const [bundleKey, lines] of Object.entries(bundleGroups)) {
    if (lines.length < 2) continue; // Only merge if more than one line

    // Get bundle_discount and bundle_name from the first line (assume all lines have the same)
    const bundleDiscount = parseFloat(lines[0].bundle_discount?.value || "0");
    const bundleName = lines[0].bundle_name?.value || "Bundle";

    // Prepare cartLines for merge
    const cartLines = lines.map(line => ({
      cartLineId: line.id,
      quantity: line.quantity,
    }));

    // Use the first variant as the parent (could be improved)
    const parentVariantId = lines[0].merchandise.__typename === "ProductVariant"
      ? lines[0].merchandise.id
      : null;

    if (!parentVariantId) continue;

    operations.push({
      linesMerge: {
        cartLines,
        parentVariantId,
        title: bundleName,
        price: bundleDiscount
          ? { percentageDecrease: { value: bundleDiscount } }
          : undefined,
        image: null,
        parentVariantId: "gid://shopify/ProductVariant/42474283892847",
        attributes: [],
      }
    });
  }

  console.log('operations', operations);

  return operations.length > 0 ? { operations } : NO_CHANGES;
}
