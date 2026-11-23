/** One argument of `cn`: a class string, or nothing. */
export type ClassValue = string | false | null | undefined;

export type ClassName<State> = ClassValue | ((state: State) => ClassValue);

export function resolveClassName<State>(className: ClassName<State>, state: State): ClassValue {
  return typeof className === 'function' ? className(state) : className;
}

/**
 * Joins class names with single spaces and leaves out the empty ones. The skin is plain CSS, so nothing is merged:
 * a caller's `className` is added beside the skin's own classes.
 */
export function cn(...classes: ClassValue[]): string {
  let joined = '';
  for (const value of classes) {
    if (value) joined += joined ? ` ${value}` : value;
  }
  return joined;
}
