# Stripe-inspired Transaction Precision

**Mental model:** Invisible precision. Trust comes from rigorous hierarchy, explicit transaction state, and safe recovery.

Show amount, currency, entitlement, cancellation/refund, pending confirmation, and authoritative success. Failure preserves input and gives a safe recovery action. A redirect alone is never success.
