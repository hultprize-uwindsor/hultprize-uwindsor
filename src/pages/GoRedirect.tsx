import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Client-side fallback for the /go short link used on printed materials.
// The primary redirect happens at the edge via vercel.json ("redirects"),
// which fires before any JS loads. This component only covers the rare
// case where that edge redirect didn't apply (e.g. local dev preview).
export default function GoRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/compete#signup', { replace: true })
  }, [navigate])

  return (
    <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
      <p>Redirecting to the sign-up page…</p>
    </div>
  )
}
