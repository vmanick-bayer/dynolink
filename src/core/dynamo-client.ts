import {DynamoDBClient} from '@aws-sdk/client-dynamodb';

export const dynamoClient = new DynamoDBClient({
    // Use your AWS credentials and region
    // region: 'us-east-1',
});