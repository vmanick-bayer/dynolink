import {mockClient} from 'aws-sdk-client-mock';
import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand
} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';
import {UserRepository} from "../../src/examples/repositories/user.repository";
import {User} from "../../src/examples/models/user.entity";

// Setup mock
const ddbMock = mockClient(DynamoDBClient);

describe('User Repository', () => {
    let repo: UserRepository;

    beforeEach(() => {
        ddbMock.reset(); // reset mock between tests
        repo = new UserRepository(new DynamoDBClient({}));
    });

    it('should save a new entity', async () => {
        const user: User = {
            id: "user_1",
            email: "user1@test.com",
            status: "open",
            name: "User 1"
        };

        ddbMock.on(PutItemCommand).resolves({});

        await repo.save(user);

        expect(ddbMock).toHaveReceivedCommand(PutItemCommand);
        const sentCommand = ddbMock.commandCalls(PutItemCommand)[0].args[0];
        expect(sentCommand.input.TableName).toBe('User');
    });

    it('should find an existing entity', async () => {

        const user: User = {
            id: "user_1",
            email: "user1@test.com",
            createdAt: new Date().toISOString(),
            status: "open",
            name: "User 1"
        };
        ddbMock.on(GetItemCommand).resolves({
            Item: marshall(user),
        });
        const result = await repo.findOne({ id: "user_1", name: "User 1"});
        expect(ddbMock).toHaveReceivedCommand(GetItemCommand)
        expect(result).toEqual(expect.objectContaining(user));
    });

    it('should return null when item is not found', async () => {
        ddbMock.on(GetItemCommand).resolves({});
        const result = await repo.findOne({ id: "user_2", name: "User 1"});
        expect(result).toBeNull();
    });

    it('should call BatchWriteItemCommand with marshalled items', async () => {
        ddbMock.on(BatchWriteItemCommand).resolves({});
        const user: User = {id: '1', email: "user1@test.com", name: 'Alpha', status: 'open'}
        const user1: User = {id: '2', email: "user2@test.com", name: 'Beta', status: 'open'}

        const sampleData = [
            user,
            user1
        ];
        await repo.batchWrite(sampleData);

        expect(ddbMock.commandCalls(BatchWriteItemCommand).length).toBe(1);

        const input = ddbMock.commandCalls(BatchWriteItemCommand)[0].args[0]
            .input;
        expect(input?.RequestItems?.[repo['tableName']].length).toBe(2);
    });

    it('should call BatchGetItemCommand and return unmarshalled items', async () => {
        const user: User = {id: '1', email: "user1@test.com", name: 'Alpha', status: 'open'}
        const user1: User = {id: '2', email: "user2@test.com", name: 'Beta', status: 'open'}

        const sampleData = [
            user,
            user1
        ];
        const items = sampleData.map((item) => marshall(item));

        ddbMock.on(BatchGetItemCommand).resolves({
            Responses: {
                [repo['tableName']]: items,
            },
        });

        const keys = sampleData.map(({id, name}) => ({id, name}));
        const result = await repo.batchGet(keys);

        expect(ddbMock.commandCalls(BatchGetItemCommand).length).toBe(1);
        expect(result.length).toBe(2);
        expect(result[0]).toMatchObject({id: '1', name: 'Alpha'});
    });
});
