// frontend/src/components/checkout/ShippingStep.tsx
// Step 2: Shipping method selection (simplified for learning).
function ShippingStep(): React.JSX.Element {
  return (
    <div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        Shipping Method
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400">
        Standard Shipping (3‑5 business days) – <strong>Free</strong>
      </p>
      {/* In a full version, we would fetch shipping options from the backend
          and render radio buttons for each option. */}
    </div>
  );
}

export default ShippingStep;
