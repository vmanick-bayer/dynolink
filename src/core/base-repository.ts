import {
    DynamoDBClient,
    GetItemCommand,
    DeleteItemCommand,
    PutItemCommand,
    UpdateItemCommand,
    QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getEntityMetadata } from './decorators';
import { QueryBuilder, QueryFilter } from './query-builder';
import { v4 as uuidv4 } from 'uuid';

/**
 * BaseRepository class for managing DynamoDB entities.
 */
export abstract class BaseRepository<T> {
    protected metadata = getEntityMetadata(this.getEntityType());
    protected tableName = this.metadata.tableName;

    constructor(protected client: DynamoDBClient) {}

    abstract getEntityType(): new (...args: any[]) => T;

    /**
     * Applies default values and auto-generated IDs to the entity.
     * @param entity
     * @protected
     */
    protected applyDefaultsAndAutoId(entity: T): T {
        for (const [key, attr] of this.metadata.attributes.entries()) {
            const val = (entity as any)[key];
            if (attr.autoId && !val) (entity as any)[key] = uuidv4();
            else if ((val === undefined || val === null) && attr.defaultValue !== undefined)
                (entity as any)[key] = typeof attr.defaultValue === 'function'
                    ? attr.defaultValue()
                    : attr.defaultValue;
        }
        return entity;
    }

    /**
     * Transforms the entity using the defined transformers.
     * @param entity
     * @param dir
     * @protected
     */
    protected transform(entity: T, dir: 'toDb' | 'fromDb'): T {
        for (const [key, attr] of this.metadata.attributes.entries()) {
            const transformer = attr.transformer;
            if (transformer) (entity as any)[key] = transformer((entity as any)[key], dir);
        }
        return entity;
    }

    /**
     * Saves the entity to DynamoDB.
     * @param entity
     */
    async save(entity: T): Promise<void> {
        this.applyDefaultsAndAutoId(entity);
        const data = marshall(this.transform(entity, 'toDb'), { removeUndefinedValues: true, convertClassInstanceToMap: true });
        await this.client.send(new PutItemCommand({ TableName: this.tableName, Item: data }));
    }

    /**
     * Updates an entity in DynamoDB.
     * @param key
     * @param updatedEntity
     */
    async update(key: Partial<T>, updatedEntity: T): Promise<void> {
        const fullItem = { ...key, ...updatedEntity };
        const data = marshall(this.transform(fullItem, 'toDb'), { removeUndefinedValues: true, convertClassInstanceToMap: true });
        await this.client.send(new PutItemCommand({ TableName: this.tableName, Item: data }));
    }

    /**
     * Updates partial fields of an entity in DynamoDB.
     * @param key
     * @param updates
     */
    async updatePartial(key: Partial<T>, updates: Partial<T>): Promise<void> {
        const pk = this.getKey(key);
        const expressions:string[] = [];
        const names: Record<string, string> = {};
        const values: Record<string, any> = {};

        Object.entries(updates).forEach(([k, v], i) => {
            const attr = `#attr${i}`;
            const val = `:val${i}`;
            expressions.push(`${attr} = ${val}`);
            names[attr] = k;
            values[val] = v;
        });

        await this.client.send(
            new UpdateItemCommand({
                TableName: this.tableName,
                Key: marshall(pk),
                UpdateExpression: `SET ${expressions.join(', ')}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: marshall(values),
            })
        );
    }

    /**
     * Deletes an entity from DynamoDB.
     * @param key
     */
    async delete(key: Partial<T>): Promise<void> {
        const pk = this.getKey(key);
        await this.client.send(
            new DeleteItemCommand({
                TableName: this.tableName,
                Key: marshall(pk),
            })
        );
    }

    /**
     *  Finds an entity by its primary key.
     * @param key
     */
    async findOne(key: Partial<T>): Promise<T | null> {
        const pk = this.getKey(key);
        const res = await this.client.send(
            new GetItemCommand({ TableName: this.tableName, Key: marshall(pk) })
        );
        if (!res.Item) return null;
        const entity = unmarshall(res.Item) as T;
        return this.transform(entity, 'fromDb');
    }

    /**
     * Queries the table using the provided filters.
     * @param filters
     */
    async query(filters: QueryFilter): Promise<T[]> {
        const builder = new QueryBuilder<T>(this.metadata);
        const params = builder.build(filters);

        const res = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                ...params,
            })
        );

        return (res.Items || []).map((item) =>
            this.transform(unmarshall(item) as T, 'fromDb')
        );
    }

    /**
     * Generates the key for the entity based on its partition and sort keys.
     * @param input
     * @protected
     */
    protected getKey(input: Partial<T>) {
        const keys: any = {};
        for (const [key, attr] of this.metadata.attributes.entries()) {
            if (attr.isPartitionKey || attr.isSortKey) {
                keys[key] = (input as any)[key];
            }
        }
        return keys;
    }
}
