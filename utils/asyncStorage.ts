import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Stores a JSON-serializable value in AsyncStorage under the provided key.
 *
 * @param key Storage key used to persist the value.
 * @param value Value to serialize and save.
 * @returns A promise that resolves when the value has been written.
 */
export async function setAsyncStorageItem<T>(
  key: string,
  value: T,
): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * Reads and parses a JSON value from AsyncStorage for the provided key.
 *
 * @param key Storage key used to retrieve the persisted value.
 * @returns The parsed value when present, otherwise null.
 */
export async function getAsyncStorageItem<T>(key: string): Promise<T | null> {
  const storedValue = await AsyncStorage.getItem(key);
  if (!storedValue) return null;

  return JSON.parse(storedValue) as T;
}

/**
 * Removes a value from AsyncStorage for the provided key.
 *
 * @param key Storage key used to remove the value.
 * @returns A promise that resolves when the value has been removed.
 */
export async function removeAsyncStorageItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
