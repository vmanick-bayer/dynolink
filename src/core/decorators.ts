import 'reflect-metadata';

export type AttributeType = 'S' | 'N' | 'B';

export interface ColumnOptions {
    type?: AttributeType;
    defaultValue?: any;
    autoId?: boolean;
    transformer?: (val: any, dir: 'toDb' | 'fromDb') => any;
    validations?: any;
    gsi?: GSIOptions;
    lsi?: LSIOptions;
}

export interface AttributeMetadata extends ColumnOptions {
    isPartitionKey?: boolean;
    isSortKey?: boolean;
}

export interface EntityMetadata {
    tableName: string;
    attributes: Map<string, AttributeMetadata>;
    partitionKey?: string;
    sortKey?: string;
}

export interface GSIOptions {
    name: string;
    partitionKey: string;
    sortKey?: string;
    projection?: {
        ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
        NonKeyAttributes?: string[];
    };
}

export interface LSIOptions {
    name: string;
    sortKey: string;
    projection?: {
        ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
        NonKeyAttributes?: string[];
    };
}

// Storage
const ENTITY_METADATA = new Map<Function, EntityMetadata>();

/**
 * Gets or creates the entity metadata for the given target.
 * @param target
 */
export function getOrCreateEntityMeta(target: any): EntityMetadata {
    const constructor = target.constructor;
    let meta = ENTITY_METADATA.get(constructor);
    if (!meta) {
        meta = {
            tableName: '',
            attributes: new Map(),
        };
        ENTITY_METADATA.set(constructor, meta);
    }
    return meta;
}

export function setEntityMetadata(target: Function, metadata: EntityMetadata) {
    ENTITY_METADATA.set(target, metadata);
}

export function getEntityMetadata<T>(constructor: new () => T): EntityMetadata {
    return ENTITY_METADATA.get(constructor)!;
}

// Decorators

/**
 * Marks a class as a DynamoDB entity.
 * @param name
 * @constructor
 */
export function Table(name: string): ClassDecorator {
    return (target) => {
        const metadata = getOrCreateEntityMeta(target.prototype);
        metadata.tableName = name;
        setEntityMetadata(target, metadata);
    };
}

/**
 * Marks a property as a column in the entity.
 * @param options
 * @constructor
 */
export function Column(options: ColumnOptions = {}): PropertyDecorator {
    return (target, propertyKey) => {
        const meta = getOrCreateEntityMeta(target);
        meta.attributes.set(propertyKey as string, {
            ...(meta.attributes.get(propertyKey as string) || {}),
            ...options,
        });
    };
}

/**
 * Marks a property as the partition key for the entity.
 * @constructor
 */
export function PartitionKey(): PropertyDecorator {
    return (target, propertyKey) => {
        const meta = getOrCreateEntityMeta(target);
        const attr = meta.attributes.get(propertyKey as string) || {};
        meta.attributes.set(propertyKey as string, { ...attr, isPartitionKey: true });
    };
}

/**
 * Marks a property as the sort key for the entity.
 * @constructor
 */
export function SortKey(): PropertyDecorator {
    return (target, propertyKey) => {
        const meta = getOrCreateEntityMeta(target);
        const attr = meta.attributes.get(propertyKey as string) || {};
        meta.attributes.set(propertyKey as string, { ...attr, isSortKey: true });
    };
}

/**
 *  Marks a property as a global secondary index (GSI).
 * @param options
 * @constructor
 */
export function GSI(options: GSIOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const meta = getOrCreateEntityMeta(target);
        const attr = meta.attributes.get(propertyKey as string) || {};
        attr.gsi = options;
        meta.attributes.set(propertyKey as string, attr);
    };
}

/**
 * Marks a property as a local secondary index (LSI).
 * @param options
 * @constructor
 */
export function LSI(options: LSIOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const meta = getOrCreateEntityMeta(target);
        const attr = meta.attributes.get(propertyKey as string) || {};
        attr.lsi = options;
        meta.attributes.set(propertyKey as string, attr);
    };
}
