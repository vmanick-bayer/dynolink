import {CreateTableCommand, CreateTableCommandInput, DynamoDBClient} from '@aws-sdk/client-dynamodb';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';

describe('createTableLocal', () => {
   const client = new DynamoDBClient({
        region: 'us-west-2',
        endpoint: 'http://localhost:8000', // Use local DynamoDB endpoint
    });


    it('should create a table locally', async () => {
        const createTableParams = {
            TableName: 'Users',
            KeySchema: [
                { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
            ],
            AttributeDefinitions: [
                { AttributeName: 'id', AttributeType: 'S' }, // String attribute
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
            },
        } satisfies CreateTableCommandInput;

        const createTable = new CreateTableCommand(createTableParams);
        await client.send(createTable);
        const listTablesCommand = new ListTablesCommand({});
        const data = await client.send(listTablesCommand);

        console.log('Tables:', data.TableNames);
    });
})