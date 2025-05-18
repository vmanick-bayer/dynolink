import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
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
});
