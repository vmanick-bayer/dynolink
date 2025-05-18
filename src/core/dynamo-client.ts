import { DynamoDB } from 'aws-sdk';

export const dynamoClient = new DynamoDB.DocumentClient({
    region: 'us-east-1',
});