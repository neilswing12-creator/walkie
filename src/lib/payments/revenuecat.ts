/** RevenueCat webhook → Subscription rows for iOS / Android in-app purchases. */
export function mapRevenueCatEvent(type: string): string | null {
  switch (type) {
    case "INITIAL_PURCHASE": case "RENEWAL": case "UNCANCELLATION": case "PRODUCT_CHANGE": case "SUBSCRIPTION_EXTENDED": return "ACTIVE";
    case "CANCELLATION": return "ACTIVE"; // still active until expiration; cancelAtPeriodEnd set
    case "BILLING_ISSUE": return "PAST_DUE";
    case "EXPIRATION": return "EXPIRED";
    case "REFUND": case "REFUND_REVERSED": return type === "REFUND" ? "REFUNDED" : "ACTIVE";
    default: return null;
  }
}
