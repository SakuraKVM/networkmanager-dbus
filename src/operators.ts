/**
 * Custom RXJS operators.
 */

import { distinctUntilKeyChanged } from 'rxjs/operators';
import { Properties } from './dbus-types';
import { Variant } from '@astrohaus/dbus-next';

export function distinctUntilVariantChanged<T extends Record<string, Variant<any>>, K extends keyof T>(
    key: K,
    compare: (x: T[K]['value'], y: T[K]['value']) => boolean,
) {
    return distinctUntilKeyChanged<T, K>(key, (x, y) => (compare ? compare(x.value, y.value) : x.value === y.value));
}
