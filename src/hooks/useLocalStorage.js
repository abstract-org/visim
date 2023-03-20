import { useEffect, useState } from 'react'

export const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            console.log(`Hook read`)
            const item = window.localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.error(error)
            return initialValue
        }
    })

    useEffect(() => {
        console.log(`Hook set`)
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue))
        } catch (error) {
            console.error(error)
        }
    }, [key, storedValue])

    return [storedValue, setStoredValue]
}
