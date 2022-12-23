import { createContext, useContext, useEffect, useState } from 'react'

import { SupabaseClient } from '../services/supabase/SupabaseClient'

const initialState = {
  session: null,
  user: null,
  signUp: null,
  signIn: null,
  signOut: null
}
export const AuthContext = createContext(initialState)

export function SupabaseAuthProvider({ children }) {
  const client = SupabaseClient
  const [state, setState] = useState(initialState)

  useEffect(() => {
    client.auth.getSession().then(({ data: { session } }) => {
      setState({ session, user: session?.user ?? null })
    })

    const listener = client.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null })
    })

    return () => {
      listener.data.subscription.unsubscribe()
    }
  }, [])

  const redirectOptions = { emailRedirectTo: window.location.origin }
  const value = {
    signUp: (data) =>
      client.auth.signUp({
        ...data,
        options: data.email && { ...data.options, ...redirectOptions }
      }),
    signIn: (data) =>
      client.auth.signInWithOtp({
        ...data,
        options: data.email && { ...data.options, ...redirectOptions }
      }),
    signOut: () => client.auth.signOut(),
    user: state.user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useSupabaseAuth = () => useContext(AuthContext)