import { useEffect, useState } from 'react'
import Storefront from './pages/Storefront.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')

  useEffect(() => {
    function handleHashChange() {
      setRoute(window.location.hash || '#/')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route.startsWith('#/admin')) return <Admin />
  return <Storefront />
}
