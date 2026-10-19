import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { BusinessProfile } from '../../types'
import CompetitorPricingWidget from './CompetitorPricingWidget'

vi.mock('../WidgetCard', () => ({ default: ({ children, onGenerate }: { children: ReactNode; onGenerate: () => void }) => <div><button onClick={onGenerate}>Generate</button>{children}</div> }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function show(sources?: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: JSON.stringify({ competitorOverview: [{ competitorType: 'Mid-tier bakeries', exampleNames: 'Test Bakery', priceRange: 'Comparable price not found', strength: '', weakness: '', ...(sources === undefined ? {} : { sources }) }] }) }))))
  render(<CompetitorPricingWidget profile={{ companyName: 'Test', industry: 'Bakery', city: 'Bukit Jalil' } as BusinessProfile} pricingInputs={{ monthlyRevenueRange: null, productServiceNames: null, costPerProduct: null }} />)
  fireEvent.click(screen.getByText('Generate'))
  await screen.findByText('Mid-tier bakeries')
}

it('shows sources under the business names without changing the category heading', async () => {
  await show([{ name: 'Test Bakery', url: 'https://example.com/menu' }])
  expect(screen.getByText('Test Bakery')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: /View source — Test Bakery/ })
  expect(link).toHaveAttribute('href', 'https://example.com/menu')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})
it('hides unsafe or malformed source links', async () => {
  await show([{ name: 'Bad', url: 'javascript:alert(1)' }, { name: 'Bad', url: 'not a URL' }, null, { name: 'Bad', url: 'https://user:password@example.com' }])
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})
it('still renders older responses without sources', async () => {
  await show()
  expect(screen.getByText('Test Bakery')).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})
