// src/models/user.entity.ts
import {
    Table,
    Column,
    PartitionKey,
    GSI,
    LSI, SortKey,
} from '../../core/decorators';

@Table("User")
export class User {
    @PartitionKey()
    @Column()
    id!: string;

    @SortKey()
    @Column()
    name!: string;

    @Column({ type: 'S' })
    @GSI({
        name: 'email-idx',
        partitionKey: 'email',
        projection: { ProjectionType: 'ALL' },
    })
    email!: string;


    @Column()
    @LSI({
        name: 'status-idx',
        sortKey: 'status',
        projection: { ProjectionType: 'ALL' },
    })
    status!: string;

    @Column({
        type: 'S',
        defaultValue: () => new Date().toISOString(),
    })
    createdAt?: string;

    // Add any additional fields you want
}
