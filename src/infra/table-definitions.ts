// infra/table-definitions.ts
import {
    AttributeDefinition,
    CreateTableCommandInput,
    GlobalSecondaryIndex,
    KeySchemaElement,
    LocalSecondaryIndex
} from "@aws-sdk/client-dynamodb";
import {AttributeType, getEntityMetadata} from "../core/decorators";

/**
 * Generates a unified CreateTableCommandInput for multiple entities.
 * @param entities
 */
export function generateUnifiedCreateTableInput(entities: (new () => any)[]): CreateTableCommandInput {
    const attributeSet = new Map<string, AttributeType>();
    let tableName: string | undefined;
    const keySchema: KeySchemaElement[] = [];
    const gsis: GlobalSecondaryIndex[] = [];
    const lsis: LocalSecondaryIndex[] = [];

    for (const entity of entities) {
        const meta = getEntityMetadata(entity);
        if (!meta) throw new Error(`Missing metadata for ${entity.name}`);

        // Set the common table name
        if (!tableName) tableName = meta.tableName;
        if (tableName !== meta.tableName) throw new Error('Entities must share the same table name');

        // Collect attribute types
        for (const [name, attr] of meta.attributes) {
            if (attr.isPartitionKey || attr.isSortKey || attr.gsi || attr.lsi) {
                attributeSet.set(name, attr.type || 'S');
            }
        }

        // Collect key schema (assumes shared PK/SK naming convention)
        for (const [name, attr] of meta.attributes) {
            if (attr.isPartitionKey && !keySchema.find(k => k.KeyType === 'HASH')) {
                keySchema.push({ AttributeName: name, KeyType: 'HASH' });
            }
            if (attr.isSortKey && !keySchema.find(k => k.KeyType === 'RANGE')) {
                keySchema.push({ AttributeName: name, KeyType: 'RANGE' });
            }
        }

        // GSIs
        for (const [name, attr] of meta.attributes) {
            if (attr.gsi && !gsis.find(g => g.IndexName === attr.gsi!.name)) {
                const gsiSchema: KeySchemaElement[] = [
                    { AttributeName: attr.gsi.partitionKey, KeyType: 'HASH' },
                ];
                if (attr.gsi.sortKey) {
                    gsiSchema.push({ AttributeName: attr.gsi.sortKey, KeyType: 'RANGE' });
                }

                // Add attribute definitions too
                attributeSet.set(attr.gsi.partitionKey, 'S');
                if (attr.gsi.sortKey) attributeSet.set(attr.gsi.sortKey, 'S');

                gsis.push({
                    IndexName: attr.gsi.name,
                    KeySchema: gsiSchema,
                    Projection: attr.gsi.projection || { ProjectionType: 'ALL' },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 5,
                        WriteCapacityUnits: 5,
                    },
                });
            }
        }

        // LSIs
        for (const [name, attr] of meta.attributes) {
            if (attr.lsi && !lsis.find(l => l.IndexName === attr.lsi!.name)) {
                attributeSet.set(attr.lsi.sortKey, 'S');
                lsis.push({
                    IndexName: attr.lsi.name,
                    KeySchema: [
                        { AttributeName: keySchema.find(k => k.KeyType === 'HASH')!.AttributeName, KeyType: 'HASH' },
                        { AttributeName: attr.lsi.sortKey, KeyType: 'RANGE' },
                    ],
                    Projection: attr.lsi.projection || { ProjectionType: 'ALL' },
                });
            }
        }
    }

    const attributeDefinitions: AttributeDefinition[] = Array.from(attributeSet).map(([name, type]) => ({
        AttributeName: name,
        AttributeType: type,
    }));

    return {
        TableName: tableName!,
        KeySchema: keySchema,
        AttributeDefinitions: attributeDefinitions,
        BillingMode: 'PAY_PER_REQUEST',
        GlobalSecondaryIndexes: gsis.length ? gsis : undefined,
        LocalSecondaryIndexes: lsis.length ? lsis : undefined,
        StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
    };
}
