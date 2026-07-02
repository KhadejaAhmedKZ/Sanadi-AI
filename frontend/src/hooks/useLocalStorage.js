import { useEffect, useRef, useState } from "react";

// Small persisted-state hook for client-only tools (checklists, reminders,
// growth entries, clinical notes…) that don't need a backend record.
//
// Handles a changing `key` correctly (e.g. a doctor switching between
// patients): when the key changes we LOAD that key's stored value instead of
// writing the previous key's value into it.
export function useLocalStorage(key, initialValue) {
  const initialRef = useRef(initialValue);

  function read(k) {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : initialRef.current;
    } catch {
      return initialRef.current;
    }
  }

  const [value, setValue] = useState(() => read(key));
  const keyRef = useRef(key);
  const skipWriteRef = useRef(false);

  // Key changed → switch to the new key's data; suppress the write effect for
  // this commit so the old value is never persisted under the new key.
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      skipWriteRef.current = true;
      setValue(read(key));
    }
  }, [key]);

  useEffect(() => {
    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
