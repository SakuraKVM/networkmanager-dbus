import DBus from '@astrohaus/dbus-next';
import { Observable } from 'rxjs';
import { Properties } from './dbus-types';

export async function objectInterface(
    bus: DBus.MessageBus,
    objectPath: string,
    interfaceName: string,
): Promise<DBus.ClientInterface> {
    const proxyObject = await bus.getProxyObject('org.freedesktop.NetworkManager', objectPath);

    try {
        return proxyObject.getInterface(interfaceName);
    } catch (error) {
        throw new Error(`Error getting ${interfaceName} interface on ${objectPath}: ${error}`);
    }
}

export function signal<T extends Array<any> = any[]>(
    objectInterface: DBus.ClientInterface,
    signalName: string,
): Observable<T> {
    return new Observable<T>((observer) => {
        const listener = (...args: T) => {
            observer.next(args);
        };

        objectInterface.on(signalName, listener as any);
        return {
            unsubscribe() {
                objectInterface.off(signalName, listener as any);
            },
        };
    });
}

export async function call<T = any>(
    objectInterface: DBus.ClientInterface,
    methodName: string,
    ...args: any[]
): Promise<T> {
    return await objectInterface[methodName](...args);
    try {
        const result = await objectInterface[methodName](...args);
        return result;
    } catch (error) {
        throw new Error(`Error calling ${methodName} on ${objectInterface.$name}: ${error}`);
    }
}

export function getPropertiesInterface(object: DBus.ProxyObject) {
    try {
        return object.getInterface('org.freedesktop.DBus.Properties');
    } catch (error) {
        throw new Error(`Error getting interface for properties: ${error}`);
    }
}

export async function getProperty(objectInterface: DBus.ClientInterface, propertyName: string): Promise<any> {
    const object = objectInterface.$object as unknown as DBus.ProxyObject;
    const propertiesInterface = getPropertiesInterface(object);

    try {
        return await propertiesInterface.Get(objectInterface.$name, propertyName);
    } catch (error) {
        throw new Error(
            `Error getting property ${propertyName} on ${objectInterface.$name} interface for object ${object.path}: ${error}`,
        );
    }
}

export async function setProperty(
    objectInterface: DBus.ClientInterface,
    propertyName: string,
    value: any,
): Promise<any> {
    const object = objectInterface.$object as unknown as DBus.ProxyObject;
    const propertiesInterface = getPropertiesInterface(object);

    try {
        return await propertiesInterface.Set(objectInterface.$name, propertyName, value);
    } catch (error) {
        throw new Error(
            `Error setting property ${propertyName} on ${objectInterface.$name} interface for object ${object.path}: ${error}`,
        );
    }
}

export async function getAllProperties<TPropetries extends Properties = Properties>(
    objectInterface: DBus.ClientInterface,
): Promise<TPropetries> {
    const object = objectInterface.$object as unknown as DBus.ProxyObject;
    const propertiesInterface = getPropertiesInterface(object);

    try {
        return await propertiesInterface.GetAll(objectInterface.$name);
    } catch (error) {
        throw new Error(
            `Error getting all properties for object ${objectInterface.objectPath} with interface ${objectInterface.interfaceName}: ${error}`,
        );
    }
}

export function byteArrayToString(array: Buffer): string {
    return array.toString('utf-8');
}

export function stringToByteArray(input: string): Buffer {
    return Buffer.from(input);
}

export function int32ToByteArray(int: number): Uint8Array {
    let byteArray = new ArrayBuffer(4); // an Int32 takes 4 bytes
    new DataView(byteArray).setUint32(0, int, false); // byteOffset = 0; litteEndian = false

    return new Uint8Array(byteArray);
}

export function formatIp4Address(ipAddress: number) {
    if (ipAddress === 0) {
        return null;
    }

    const byteArray = int32ToByteArray(ipAddress);

    return byteArray.reverse().join('.');
}

export function formatIp6Address(input: Buffer) {
    return input
        .toString('hex')
        .match(/.{1,4}/g)!
        .map((val) => val.replace(/^0+/, ''))
        .join(':')
        .replace(/0000\:/g, ':')
        .replace(/:{2,}/, '::');
}

export function marshalIp4Address(input: string) {
    const parts = input.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
        throw new Error('Invalid IPv4 address');
    }

    return (parts[3] << 24) | (parts[2] << 16) | (parts[1] << 8) | parts[0];
}

export function marshalIp6Address(input: string) {
    const parts = input.split('::');

    let head = parts[0] ? parts[0].split(':') : [];
    let tail = parts[1] ? parts[1].split(':') : [];

    // 如果有 ::，需要填补中间的零
    const zeroCount = 8 - (head.length + tail.length);
    const zeros = new Array(zeroCount).fill('0');

    const fullParts = [...head, ...zeros, ...tail];

    if (fullParts.length !== 8) {
        throw new Error(`Invalid IPv6 address: ${input}`);
    }

    // 每个块是 16-bit，要拆成两个 8-bit 字节
    const bytes = fullParts.flatMap(part => {
        const value = parseInt(part, 16);
        return [(value >> 8) & 0xff, value & 0xff];
    });

    return Buffer.from(bytes);
}
