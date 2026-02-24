import { StateStorage } from 'zustand/middleware'
import { createMMKV } from 'react-native-mmkv'

export const mmkvStorage = createMMKV()

export const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return mmkvStorage.set(name, value)
  },
  getItem: (name) => {
    const value = mmkvStorage.getString(name)
    return value ?? null
  },
  removeItem: (name) => {
    return mmkvStorage.remove(name)
  },
}
