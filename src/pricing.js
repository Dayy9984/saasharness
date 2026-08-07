const PLAN_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;
const ENTITLEMENT_KEY = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const CURRENCY = /^[A-Z]{3}$/;
const BILLING_MODES = new Set(['one-time', 'subscription', 'credits']);

function requireString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} must be a non-empty string`);
}

function expectedBillingMode(monetization) {
  if (monetization === 'one-time') return 'one-time';
  if (monetization === 'credits') return 'credits';
  if (monetization === 'subscription' || monetization === 'subscription-plus-credits') return 'subscription';
  return null;
}

export function normalizePricingPlans(product) {
  const source = product.pricing?.plans;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return Object.entries(source).map(([id, value]) => {
    const plan = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      id,
      name: plan.name,
      billing_mode: plan.billing_mode,
      amount_minor: plan.amount_minor,
      currency: typeof plan.currency === 'string' ? plan.currency.toUpperCase() : plan.currency,
      entitlement_key: plan.entitlement_key,
      credit_amount: plan.credit_amount ?? 0,
      stripe_price_id: plan.stripe_price_id ?? null,
      active: plan.active !== false,
    };
  });
}

export function validatePricingPlans(product, errors, warnings = []) {
  const plans = normalizePricingPlans(product);
  if (product.monetization === 'free') {
    if (plans.length) warnings.push('pricing plans are ignored while monetization is free');
    return plans;
  }
  if (plans.length === 0) {
    errors.push('product.pricing.plans must define at least one paid plan for a monetized product');
    return plans;
  }

  const expected = expectedBillingMode(product.monetization);
  for (const [index, plan] of plans.entries()) {
    const prefix = `product.pricing.plans.${plan.id || index}`;
    if (!PLAN_ID.test(plan.id)) errors.push(`${prefix} id must use lowercase letters, numbers, and hyphens`);
    requireString(plan.name, `${prefix}.name`, errors);
    if (!BILLING_MODES.has(plan.billing_mode)) {
      errors.push(`${prefix}.billing_mode must be one-time, subscription, or credits`);
    } else if (expected && plan.billing_mode !== expected) {
      errors.push(`${prefix}.billing_mode must be ${expected} for monetization ${product.monetization}`);
    }
    if (!Number.isSafeInteger(plan.amount_minor) || plan.amount_minor <= 0) {
      errors.push(`${prefix}.amount_minor must be a positive safe integer in minor currency units`);
    }
    if (typeof plan.currency !== 'string' || !CURRENCY.test(plan.currency)) {
      errors.push(`${prefix}.currency must be a three-letter ISO-style uppercase code`);
    }
    if (typeof plan.entitlement_key !== 'string' || !ENTITLEMENT_KEY.test(plan.entitlement_key)) {
      errors.push(`${prefix}.entitlement_key has an invalid format`);
    }
    if (!Number.isSafeInteger(plan.credit_amount) || plan.credit_amount < 0) {
      errors.push(`${prefix}.credit_amount must be a non-negative safe integer`);
    }
    if (product.monetization === 'subscription-plus-credits' && plan.credit_amount <= 0) {
      errors.push(`${prefix}.credit_amount must be positive for subscription-plus-credits`);
    }
    if (plan.stripe_price_id !== null && (typeof plan.stripe_price_id !== 'string' || plan.stripe_price_id.trim() === '')) {
      errors.push(`${prefix}.stripe_price_id must be null or a non-empty string`);
    }
  }
  return plans;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function seedSql(plans, dialect) {
  if (!plans.length) return '-- No paid plans for this product profile.\n';
  const active = (value) => dialect === 'postgres' ? (value ? 'TRUE' : 'FALSE') : (value ? '1' : '0');
  return `${plans.map((plan) => `INSERT INTO plan_catalog(
  id, name, billing_mode, amount_minor, currency, entitlement_key, credit_amount,
  stripe_price_id, active, created_at, updated_at
) VALUES (
  ${sqlString(plan.id)}, ${sqlString(plan.name)}, ${sqlString(plan.billing_mode)},
  ${plan.amount_minor}, ${sqlString(plan.currency)}, ${sqlString(plan.entitlement_key)},
  ${plan.credit_amount}, ${sqlString(plan.stripe_price_id)}, ${active(plan.active)}, 0, 0
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  billing_mode = excluded.billing_mode,
  amount_minor = excluded.amount_minor,
  currency = excluded.currency,
  entitlement_key = excluded.entitlement_key,
  credit_amount = excluded.credit_amount,
  stripe_price_id = excluded.stripe_price_id,
  active = excluded.active,
  updated_at = excluded.updated_at;
`).join('\n')}`;
}

export function pricingMigrationFiles(plan) {
  const plans = plan.product.plans ?? [];
  if (plan.product.database === 'd1') {
    return { 'migrations/d1/0006_plan_catalog.sql': seedSql(plans, 'd1') };
  }
  return { 'migrations/postgres/0006_plan_catalog.sql': seedSql(plans, 'postgres') };
}
