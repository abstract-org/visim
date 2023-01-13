import { createContext, useContext, useEffect, useState } from 'react'

import { simSdk } from '../sdk'

const initialState = {
    session: null,
    user: null,
    signUp: null,
    signIn: null,
    signOut: null
}
export const AuthContext = createContext(initialState)

export function SupabaseAuthProvider({ children }) {
    const authClient = simSdk.auth
    const [state, setState] = useState(initialState)

    useEffect(() => {
        authClient.getSession().then(({ data: { session } }) => {
            setState({ session, user: session?.user ?? null })
        })

        const listener = authClient.onAuthStateChange((_event, session) => {
            setState({ session, user: session?.user ?? null })
        })

        return () => {
            listener.data.subscription.unsubscribe()
        }
    }, [])

    const redirectOptions = { emailRedirectTo: window.location.origin }
    const value = {
        signUp: (data) =>
            authClient.signUp({
                ...data,
                options: data.email && { ...data.options, ...redirectOptions }
            }),
        signIn: (data) =>
            authClient.signInWithOtp({
                ...data,
                options: data.email && { ...data.options, ...redirectOptions }
            }),
        signOut: () => authClient.signOut(),
        user: state.user
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useSupabaseAuth = () => useContext(AuthContext)
