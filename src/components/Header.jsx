export default function Header({ onOpenCart, onOpenSearch }) {
  return (
    <header className="nav sticky top-0 z-50 bg-white border-b">
      <div className="nav-inner container grid grid-cols-3 items-center gap-3 py-3 px-6">
        <nav className="nav-left justify-self-start flex items-center gap-5">
          <a className="relative" href="#best-sellers">Shop</a>
          <a className="relative" href="#/admin">Admin</a>
        </nav>
        <div className="logo justify-self-center font-bold tracking-[.18em]">BOUNTY</div>
        <div className="nav-right justify-self-end flex items-center justify-end gap-5">
          <a className="relative" href="#search" onClick={(e) => { e.preventDefault(); onOpenSearch?.(); }} aria-label="Open search">Search</a>
          <a className="relative" href="#login">Login</a>
          <a className="relative" href="#cart" onClick={(e) => { e.preventDefault(); onOpenCart?.(); }} aria-label="Open cart">Cart</a>
        </div>
      </div>
    </header>
  )
}


