import { BaseRepository } from '../../core/base-repository';
import { User } from '../models/user.entity';

/**
 * UserRepository class for managing User entities in DynamoDB.
 */
export class UserRepository extends BaseRepository<User> {
    getEntityType(): new () => User {
        return User;
    }
}
