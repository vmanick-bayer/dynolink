import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {UserRepository} from "../../src/examples/repositories/user.repository";
import {User} from "../../src/examples/models/user.entity";
import {ensureTable} from "../../src/infra/ensure-table";

const client = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
});

describe('UserRepository Integration', () => {
    let repo: UserRepository;

    beforeAll(async () => {
        await ensureTable( User, client);
        repo = new UserRepository(client);
    });

    it('should save and retrieve a user', async () => {
        const user = new User();
        user.name = 'John Tester';
        user.email = 'john@test.com';
        user.id = '123';
        user.status = 'open'

        await repo.save(user);

        const found = await repo.findOne({ id: user.id, name: "John Tester" });
        expect(found).not.toBeNull();
        expect(found?.name).toBe('John Tester');
    });

    it('should update partial fields', async () => {
        const user = new User();
        user.name = 'Jane Doe1';
        user.email = 'jane1@test.com';
        user.id = '12345';
        user.status = 'Being processed'

        await repo.save(user);

        await repo.updatePartial({ id: user.id, name: 'Jane Doe1' }, { status: 'Blocked' });

        const updated = await repo.findOne({ id: user.id, name: 'Jane Doe1' });
        expect(updated?.status).toBe('Blocked');
    });

    it('should delete a user', async () => {
        const user = new User();
        user.name = 'Delete Me';
        user.email = 'delete@test.com';
        user.id = "123"

        await repo.save(user);
        await repo.delete({id: user.id, name: 'Delete Me'});

        const deleted = await repo.findOne({id: user.id, name: 'Delete Me'});
        expect(deleted).toBeNull();
    });

    it('should do batch write and retrieve users', async () => {
        const user = new User();
        user.name = 'User 101';
        user.email = 'user101@test.com';
        user.id = "101";
        user.status = 'Being processed'

        const user1 = new User();
        user1.name = 'User 102';
        user1.email = 'user102@test.com';
        user1.id = "102";
        user1.status = 'Open'

        const user2 = new User();
        user2.name = 'User 103';
        user2.email = 'user103@test.com';
        user2.id = "103"
        user2.status = 'Complete'
        await repo.batchWrite([user, user1, user2]);
        const resultSet = await repo.batchGet([user, user1, user2]);
        expect(resultSet.length).toBe(3);
    });

});
