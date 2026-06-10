export function groupBy<T, Key extends string>(
  values: T[],
  getKey: (value: T) => Key
): Partial<Record<Key, T[]>> {
  const groups: Partial<Record<Key, T[]>> = {};
  for (const value of values) {
    const key = getKey(value);
    groups[key] ??= [];
    groups[key]?.push(value);
  }
  return groups;
}
