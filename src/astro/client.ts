// Browser behaviour the landing sites repeat, for their bundled `<script>` tags. Each site keeps its own markup and classes and passes them in.

interface Classy {
  classList: { toggle(token: string, force?: boolean): boolean; contains(token: string): boolean }
  toggleAttribute(name: string, force?: boolean): boolean
}

/**
 * A header that changes once the page scrolls past `threshold` pixels. It always toggles `data-scrolled`, and `className` too when given,
 * so a site can style either.
 */
export function bindScrolled(
  element: Classy | null,
  { threshold = 24, className, target }: { threshold?: number; className?: string; target?: Pick<Window, 'scrollY' | 'addEventListener'> } = {},
) {
  if (!element) return
  const scroller = target ?? window
  const update = () => {
    const scrolled = scroller.scrollY > threshold
    element.toggleAttribute('data-scrolled', scrolled)
    if (className) element.classList.toggle(className, scrolled)
  }
  update()
  scroller.addEventListener('scroll', update, { passive: true })
}

interface MenuElement extends Classy {
  querySelectorAll(selector: string): ArrayLike<{ addEventListener(type: 'click', listener: () => void): void }>
}

interface MenuButton {
  setAttribute(name: string, value: string): void
  addEventListener(type: 'click', listener: () => void): void
  focus?(): void
}

/**
 * A mobile menu opened by a button. Closed, the menu carries `closedClass`; open, `openClass` when given. The button's `aria-expanded`
 * follows, and the menu closes when one of its links is followed or Escape is pressed.
 */
export function bindMenu(
  button: MenuButton | null,
  menu: MenuElement | null,
  { closedClass = 'hidden', openClass, keyTarget }: { closedClass?: string; openClass?: string; keyTarget?: Pick<Document, 'addEventListener'> } = {},
) {
  if (!button || !menu) return
  const set = (open: boolean) => {
    menu.classList.toggle(closedClass, !open)
    if (openClass) menu.classList.toggle(openClass, open)
    button.setAttribute('aria-expanded', String(open))
  }
  const isOpen = () => !menu.classList.contains(closedClass)
  button.addEventListener('click', () => set(!isOpen()))
  for (const link of Array.from(menu.querySelectorAll('a'))) link.addEventListener('click', () => set(false))
  const keys = keyTarget ?? document
  keys.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape' && isOpen()) {
      set(false)
      button.focus?.()
    }
  })
}
