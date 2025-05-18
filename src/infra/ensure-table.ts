// infra/ensure-table.ts

import { ListTablesCommand, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { generateUnifiedCreateTableInput} from './table-definitions';
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

    if (existing.TableNames?.includes(meta.tableName)) {
        console.log(`✅ Table "${meta.tableName}" already exists`);
    } else {
        const input = generateUnifiedCreateTableInput([entity]);
        await client.send(new CreateTableCommand(input));
        console.log(`✅ Created table "${meta.tableName}"`);
    }

    // Enable TTL if `ttl` field is defined
    const hasTTL = [...meta.attributes.entries()].find(
        ([name]) => name === 'ttl'
    );

    if (hasTTL) {
        await client.send(
            new UpdateTimeToLiveCommand({
                TableName: meta.tableName,
                TimeToLiveSpecification: {
                    AttributeName: 'ttl',
                    Enabled: true,
                },
            })
        );
        console.log(`✅ TTL enabled on "${meta.tableName}" using 'ttl' attribute`);
    }
    console.log(`✅ Created table "${tableName}"`);
}
