import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { EntityMetadata } from './decorators';

export type Operator =
    | '='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'between'
    | 'in'
    | 'begins_with'
    | 'attribute_exists'
    | 'attribute_not_exists';

export interface Condition {
    field: string;
    op: Operator;
    value?: any;
}

export interface QueryFilter {
    key: Record<string, any>; // must include partition key, maybe sort key
    indexName?: string;
    conditions?: Condition[];
}

export class QueryBuilder<T> {
    constructor(private metadata: EntityMetadata) {}

    build(filter: QueryFilter): Record<string, any> {
        const ExpressionAttributeNames: Record<string, string> = {};
        const ExpressionAttributeValues: Record<string, AttributeValue> = {};

        const KeyConditionExpressions: string[] = [];
        const FilterExpressions: string[] = [];

        const { key, indexName, conditions = [] } = filter;

        Object.entries(key).forEach(([k, v]) => {
            const name = `#pk_${k}`;
            const val = `:pk_${k}`;
            ExpressionAttributeNames[name] = k;
            ExpressionAttributeValues[val] = marshall({ val: v }).val;
            KeyConditionExpressions.push(`${name} = ${val}`);
        });

        conditions.forEach((cond, i) => {
            const name = `#f_${cond.field}_${i}`;
            ExpressionAttributeNames[name] = cond.field;

            const op = cond.op;
            if (op === 'attribute_exists' || op === 'attribute_not_exists') {
                FilterExpressions.push(`${op}(${name})`);
                return;
            }

            if (op === 'between') {
                const val1 = `:val${i}_a`;
                const val2 = `:val${i}_b`;
                const [a, b] = cond.value;
                ExpressionAttributeValues[val1] = marshall({ v: a }).v;
                ExpressionAttributeValues[val2] = marshall({ v: b }).v;
                FilterExpressions.push(`${name} BETWEEN ${val1} AND ${val2}`);
            } else if (op === 'in') {
                const vals = cond.value.map((v: any, j: number) => {
                    const label = `:val${i}_${j}`;
                    ExpressionAttributeValues[label] = marshall({ val: v }).val;
                    return label;
                });
                FilterExpressions.push(`${name} IN (${vals.join(', ')})`);
            } else if (op === 'begins_with') {
                const val = `:val${i}`;
                ExpressionAttributeValues[val] = marshall({ val: cond.value }).val;
                FilterExpressions.push(`begins_with(${name}, ${val})`);
            } else {
                const val = `:val${i}`;
                ExpressionAttributeValues[val] = marshall({ val: cond.value }).val;
                const dynamoOp = op === '!=' ? '<>' : op;
                FilterExpressions.push(`${name} ${dynamoOp} ${val}`);
            }
        });

        return {
            IndexName: indexName,
            KeyConditionExpression: KeyConditionExpressions.join(' AND '),
            FilterExpression: FilterExpressions.length ? FilterExpressions.join(' AND ') : undefined,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
        };
    }
}
