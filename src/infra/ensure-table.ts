// infra/ensure-table.ts

import {CreateTableCommand, DynamoDBClient, ListTablesCommand, UpdateTimeToLiveCommand} from '@aws-sdk/client-dynamodb';
import {generateUnifiedCreateTableInput} from './table-definitions';
import {getEntityMetadata} from "../core/decorators";

/**
 * Ensures that the table for the given entity exists in DynamoDB.
 * @param entity
 * @param client
 */
export async function ensureTable<T>(entity: new () => T, client: DynamoDBClient) {
    const metadata = getEntityMetadata(entity);
    const tableName = metadata?.tableName;
    if (!tableName) throw new Error('Missing @Table decorator');

    const existing = await client.send(new ListTablesCommand({}));

    if (existing.TableNames?.includes(tableName)) {
        console.log(`✅ Table "${tableName}" already exists`);
    } else {
        const input = generateUnifiedCreateTableInput([entity]);
        await client.send(new CreateTableCommand(input));
        console.log(`✅ Created table "${tableName}"`);
    }

    // Enable TTL if `ttl` field is defined
    const hasTTL = [...metadata.attributes.entries()].find(
        ([name]) => name === 'ttl'
    );

    if (hasTTL) {
        await client.send(
            new UpdateTimeToLiveCommand({
                TableName: tableName,
                TimeToLiveSpecification: {
                    AttributeName: 'ttl',
                    Enabled: true,
                },
            })
        );
        console.log(`✅ TTL enabled on "${tableName}" using 'ttl' attribute`);
    }
    console.log(`✅ Created table "${tableName}"`);
}
