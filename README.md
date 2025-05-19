# 🧬 DynoLink

**DynoLink** is a type-safe, schema-driven DynamoDB ORM for Node.js and TypeScript. It offers a powerful and expressive `QueryBuilder`, lifecycle hooks, and repository patterns to simplify working with AWS DynamoDB.

---

## ✨ Features

- 🎯 **Type-safe** schema definition using TypeScript decorators
- 🧱 **Single-table & multi-table design** support with flexible entity modeling
- 🔄 **Full CRUD operations** via a powerful base repository
- 🔎 **Query builder** with filter operators, key conditions, and attribute functions
- 🔁 **DynamoDB Streams & TTL** integration for real-time and auto-expiring data
- ⚙️ **Auto table creation** with GSIs, LSIs, TTL, and Streams support
- 🧩 **Transformers & default values** for schema fields (e.g., formatting or generated values)
- 🧪 **Pluggable validation, serialization & deserialization** mechanisms
- 🧹 **Optional undefined value filtering** and class-to-map conversion via `marshall()`

---

## 📦 Installation

```bash
npm install dynolink
# or
yarn add dynolink
```
🚀 Quick Start

1. Define an Entity
```typescript
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
```

2. Create a Repository

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BaseRepository } from 'dynolink';
import { User } from './models/User';

class UserRepository extends BaseRepository<User> {
  constructor(client: DynamoDBClient) {
    super(User, client);
  }
}
```

3. Save and Query Records

```typescript
import {UserRepository} from "./user.repository";
import {User} from "./user.entity";

const client = new DynamoDBClient({});
const repo = new UserRepository(client);

await repo.save(new User({id: '50000123', name: 'user 1', status: 'pending', email: "test@test.com"}));

const result = await repo.findOne({id: '50000123', name: 'user 1' });
```

🔧 Decorators

| Decorator         | Description                                        |
| ----------------- | -------------------------------------------------- |
| `@Table(name)`    | Maps class to a DynamoDB table                     |
| `@Column()`       | Marks a class field as an attribute                |
| `@PartitionKey()` | Declares the field as the partition key            |
| `@SortKey()`      | Declares the field as the sort key (if applicable) |
| `@GSI()`          | Declares a Global Secondary Index                  |
| `@LSI()`          | Declares a Local Secondary Index                   |


Example with TTL and Transformation

```typescript
import {Column} from "./decorators";

@Column({
    type: 'S',
    defaultValue: () => new Date().toISOString(),
    transformer: (val, dir) => dir === 'toDb' ? val.toUpperCase() : val,
})
createdAt!:string;

@Column({type: 'N'})
ttl?:number; // Used for automatic expiration

```


🧠 Advanced Features

✅ Single Table Design
DynoLink supports single-table designs using entity type discrimination and composite keys.

```typescript
import {Column} from "./decorators";

@Table('User')
export class User {
    @PartitionKey()
    @Column() pk!: string;

    @SortKey()
    @Column() sk!: string;

    @Column() name!: string;

    @Column() email?: string;
    
    @Column() status?: string;
}
```


```typescript
import {Column} from "./decorators";

@Table('User')
export class Address {
    @PartitionKey()
    @Column() pk!: string;

    @SortKey()
    @Column() sk!: string;

    @Column() street!: string;

    @Column() zipcode?: string
}
```

⏱ TTL Support
To expire items automatically:

1. Add a TTL attribute:
```typescript
@Column({ type: 'N' })
ttl?: number;
```
2. Enable TTL in the table via ensureTable.


🔁 DynamoDB Streams
Enable streams via:

```typescript
import {User} from "./user.entity";

await ensureTable(User, client, {
    streamEnabled: true,
    streamViewType: 'NEW_AND_OLD_IMAGES'
});

```
🛠 Table Creation Programmatically

```typescript
import {ensureTable} from 'dynolink';
import {User} from "./user.entity";

await ensureTable(User, client); // Auto-creates table based on metadata

```

You can also pass options for TTL and Streams:

```typescript
import {User} from "./user.entity";

await ensureTable(User, client, {
    ttlAttributeName: 'ttl',
    streamEnabled: true,
    streamViewType: 'NEW_AND_OLD_IMAGES'
});
```


🧪 Testing Example
```typescript
it('should query items using filters', async () => {
  const result = await repository.query({
    key: {
      pk : { eq: '50000123' }, 
      sk: {  eq: "User 1"   }
    },
  });

  expect(result).toHaveLength(1);
});
```