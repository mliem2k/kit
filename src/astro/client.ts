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

interface RevealEnv {
  reducedMotion: boolean
  Observer?: typeof IntersectionObserver
  root: Pick<Document, 'querySelectorAll'>
}

/**
 * Reveals elements as they scroll into view. Each match of `selector` gets `pending` classes (the hidden start, kept so its
 * transition runs), then on entering the viewport gains `revealed` and loses `clear`, once. A visitor who prefers reduced motion, or a browser without IntersectionObserver, gets the
 * revealed state at once.
 */
export function bindReveal(
  selector: string,
  {
    pending = [],
    revealed = [],
    clear = [],
    threshold = 0.05,
    rootMargin,
    env,
  }: {
    pending?: string[]
    revealed?: string[]
    clear?: string[]
    /** One value, or one per element (for example read from a data attribute). */
    threshold?: number | ((element: HTMLElement) => number)
    rootMargin?: string
    env?: RevealEnv
  } = {},
) {
  const { reducedMotion, Observer, root } = env ?? {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    Observer: 'IntersectionObserver' in window ? IntersectionObserver : undefined,
    root: document,
  }
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
  const show = (element: Element) => {
    element.classList.remove(...clear)
    element.classList.add(...revealed)
  }
  if (reducedMotion || !Observer) {
    for (const element of elements) show(element)
    return
  }
  const observers = new Map<number, IntersectionObserver>()
  for (const element of elements) {
    const value = typeof threshold === 'function' ? threshold(element) : threshold
    let observer = observers.get(value)
    if (!observer) {
      observer = new Observer(
        (entries, self) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            show(entry.target)
            self.unobserve(entry.target)
          }
        },
        { threshold: value, rootMargin },
      )
      observers.set(value, observer)
    }
    element.classList.add(...pending)
    observer.observe(element)
  }
}
