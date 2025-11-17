import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { page } from 'vitest/browser'
import { Button } from '$lib/components/ui'

describe('Button Component', () => {
	it('should render with default variant', async () => {
		render(Button, {
			props: {
				children: 'Click me'
			}
		})

		const button = page.getByRole('button', { name: 'Click me' })
		await expect.element(button).toBeInTheDocument()
		await expect.element(button).toBeVisible()
	})

	it('should render with outline variant', async () => {
		render(Button, {
			props: {
				variant: 'outline',
				children: 'Outline Button'
			}
		})

		const button = page.getByRole('button', { name: 'Outline Button' })
		await expect.element(button).toBeInTheDocument()
		await expect.element(button).toHaveClass(/outline/)
	})

	it('should render with small size', async () => {
		render(Button, {
			props: {
				size: 'sm',
				children: 'Small Button'
			}
		})

		const button = page.getByRole('button', { name: 'Small Button' })
		await expect.element(button).toBeInTheDocument()
	})

	it('should handle click events', async () => {
		let clicked = false
		
		render(Button, {
			props: {
				onclick: () => {
					clicked = true
				},
				children: 'Clickable'
			}
		})

		const button = page.getByRole('button', { name: 'Clickable' })
		await button.click()
		
		expect(clicked).toBe(true)
	})
})