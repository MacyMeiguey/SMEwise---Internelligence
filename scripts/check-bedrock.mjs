// Live, billable smoke check. Requires the local API and a working AWS SSO session.
import assert from 'node:assert/strict';
import { FEATURE_CONTRACTS } from '../server/dist/bedrock/contracts.js';
import { matchesSchema } from '../server/dist/bedrock/schema.js';

const base = process.env.SMEWISE_CHECK_URL ?? 'http://localhost:3001';
const profile = {
  companyName: 'Kedai Kopi Maju', industry: 'Coffee shop', businessStage: 'Just Launched',
  city: 'Kuala Lumpur', targetCustomer: 'Office workers', currentFunds: 50000,
  businessType: 'Sole Proprietorship', mainGoal: 'Build a sustainable neighbourhood coffee shop',
};
const failures = [];
const skip = new Set((process.env.SMEWISE_CHECK_SKIP ?? '').split(','));
const only = (process.env.SMEWISE_CHECK_ONLY ?? '').split(',').filter(Boolean);
if (only.length) {
  for (const feature of [...Object.keys(FEATURE_CONTRACTS), 'profile-verification', 'assistant']) {
    if (!only.includes(feature)) skip.add(feature);
  }
}
async function check(feature, payload = profile) {
  if (skip.has(feature)) return null;
  const started = Date.now();
  try {
    const response = await fetch(`${base}/api/bedrock/${feature}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(240000),
    });
    const body = await response.json();
    assert.ok(response.ok, `${response.status}: ${body.error ?? 'request failed'}`);
    if (feature === 'profile-verification') {
      assert.equal(body.result, 'pass');
      console.log(`PASS ${feature}`);
      return body;
    }
    const result = JSON.parse(body.content);
    assert.ok(matchesSchema(result, FEATURE_CONTRACTS[feature]), 'response contract mismatch');
    console.log(`PASS ${feature} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return result;
  } catch (error) {
    failures.push(feature);
    console.error(`FAIL ${feature}: ${error.message}`);
    return null;
  }
}

await check('profile-verification');
const [allocation] = await Promise.all([check('fund-allocation'), check('startup')]);
if (allocation) {
  const percentage = allocation.allocations.reduce((sum, row) => sum + row.percentage, 0);
  const total = allocation.allocations.reduce((sum, row) => sum + row.amount, 0);
  if (Math.abs(percentage - 100) > 0.01 || Math.abs(total - profile.currentFunds) > 1) {
    failures.push('allocation-arithmetic');
    console.error('FAIL allocation-arithmetic');
  }
}
await Promise.all([check('office-location'), check('risk-analyzer')]);
await Promise.all([
  check('revenue-projection', { ...profile, budgetAllocation: JSON.stringify(allocation) }),
  check('loans-funding'),
]);
const marketingAllocation = allocation?.allocations.find((row) => /marketing/i.test(row.category));
const [marketing] = await Promise.all([
  check('marketing', { ...profile, fundAllocation: marketingAllocation
    ? `${marketingAllocation.percentage}% of current funds allocated to marketing (RM ${marketingAllocation.amount})`
    : '20% of current funds allocated to marketing (RM 10000)' }),
  check('investor-funding'),
]);
const marketingPlan = marketing ?? (skip.has('marketing') ? {
  company: profile.companyName, industry: profile.industry, location: profile.city,
  totalBudget: 10000, currency: 'MYR', duration: '12 months',
  phases: [
    { phaseNumber: 1, name: 'Launch', timeline: 'Months 1-3', overview: 'Build local awareness', budgetAmount: 4000, budgetPercentage: 40, tactics: [{ channel: 'Local social media', action: 'Run a neighbourhood launch campaign', amount: 4000 }] },
    { phaseNumber: 2, name: 'Retention', timeline: 'Months 4-6', overview: 'Build repeat visits', budgetAmount: 3000, budgetPercentage: 30, tactics: [{ channel: 'Loyalty', action: 'Test a repeat customer offer', amount: 3000 }] },
    { phaseNumber: 3, name: 'Referrals', timeline: 'Months 7-12', overview: 'Grow word of mouth', budgetAmount: 3000, budgetPercentage: 30, tactics: [{ channel: 'Community', action: 'Partner with nearby offices', amount: 3000 }] },
  ],
} : null);
if (marketingPlan) {
  const payload = { marketingPlanJson: JSON.stringify(marketingPlan) };
  const [, forecast] = await Promise.all([check('marketing-guidelines', payload), check('marketing-forecast', payload)]);
  if (forecast) {
    const series = forecast.timeSeriesData ?? forecast.timeSeries;
    if (!series || !Object.values(series).every((values) => Array.isArray(values) && values.length === 12)) {
      failures.push('forecast-month-alignment');
      console.error('FAIL forecast-month-alignment');
    }
  }
}
const pricingInput = { ...profile, monthlyRevenue: 'RM 5000', products: [{ name: 'Latte', cost: 'RM 3' }] };
const competitor = await check('competitor-pricing', pricingInput);
await Promise.all([
  check('smart-pricing', { ...pricingInput, competitorJson: JSON.stringify(competitor) }),
  check('analytics-dashboard'),
]);
await check('document-generator', { ...profile, documentType: 'Business Plan Summary' });

if (!skip.has('assistant')) {
try {
  const response = await fetch(`${base}/api/bedrock/assistant`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Give one short first step for my coffee shop.', context: { profile }, sessionId: `smoke-${Date.now()}` }),
    signal: AbortSignal.timeout(90000),
  });
  const stream = await response.text();
  assert.ok(response.ok && stream.includes('"delta"') && stream.includes('[DONE]') && !stream.includes('"error"'));
  console.log('PASS assistant SSE');
} catch (error) {
  failures.push('assistant');
  console.error(`FAIL assistant: ${error.message}`);
}
}
console.log(JSON.stringify({ failures }));
if (failures.length) process.exitCode = 1;
