// Prisma-like MongoDB adapter
// This file provides a minimal subset of the Prisma client API used by the project
// while using MongoDB as the backing store.

import crypto from 'crypto';
import mongoClientPromise from './mongo.js';

const toPrismaFilter = (where: any): any => {
  if (!where || typeof where !== 'object') return where;

  const filter: any = {};
  for (const key of Object.keys(where)) {
    const value = where[key];

    if (key === 'OR' && Array.isArray(value)) {
      filter.$or = value.map((w) => toPrismaFilter(w));
      continue;
    }
    if (key === 'AND' && Array.isArray(value)) {
      filter.$and = value.map((w) => toPrismaFilter(w));
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sub: any = {};
      for (const opKey of Object.keys(value)) {
        const opValue = value[opKey];
        switch (opKey) {
          case 'gt':
            sub.$gt = opValue;
            break;
          case 'gte':
            sub.$gte = opValue;
            break;
          case 'lt':
            sub.$lt = opValue;
            break;
          case 'lte':
            sub.$lte = opValue;
            break;
          case 'not':
            sub.$ne = opValue;
            break;
          case 'in':
            sub.$in = opValue;
            break;
          case 'contains':
            sub.$regex = opValue;
            sub.$options = 'i';
            break;
          case 'startsWith':
            sub.$regex = `^${opValue}`;
            sub.$options = 'i';
            break;
          case 'endsWith':
            sub.$regex = `${opValue}$`;
            sub.$options = 'i';
            break;
          case 'has':
            // Prisma "has" checks array contains value.
            sub.$in = [opValue];
            break;
          case 'hasSome':
            // Prisma "hasSome" checks array contains any of the values.
            sub.$in = opValue;
            break;
          case 'hasEvery':
            // Prisma "hasEvery" is similar to $all in Mongo
            sub.$all = opValue;
            break;
          default:
            sub[opKey] = opValue;
        }
      }
      filter[key] = sub;
    } else {
      filter[key] = value;
    }
  }

  return filter;
};

const toPrismaSort = (orderBy: any): any => {
  if (!orderBy || typeof orderBy !== 'object') return undefined;
  const res: any = {};
  for (const key of Object.keys(orderBy)) {
    const val = orderBy[key];
    if (typeof val === 'string') {
      res[key] = val.toLowerCase() === 'desc' ? -1 : 1;
    } else if (typeof val === 'object' && val !== null) {
      res[key] = val.sort?.toLowerCase() === 'desc' ? -1 : 1;
    }
  }
  return res;
};

const createModelProxy = (collectionName: string) => {
  const getCollection = async () => {
    const client = await mongoClientPromise;
    const db = client.db();
    return db.collection(collectionName);
  };

  return {
    findUnique: async ({ where }: { where: any }) => {
      const coll = await getCollection();
      return await coll.findOne(toPrismaFilter(where));
    },

    findFirst: async ({ where, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const coll = await getCollection();
      const cursor = coll.find(toPrismaFilter(where || {}));
      if (orderBy) {
        const sort = toPrismaSort(orderBy);
        if (sort) cursor.sort(sort);
      }
      return cursor.limit(1).next();
    },

    findMany: async ({ where, take, skip, orderBy }: any = {}) => {
      const coll = await getCollection();
      const cursor = coll.find(toPrismaFilter(where || {}));
      if (orderBy) {
        const sort = toPrismaSort(orderBy);
        if (sort) cursor.sort(sort);
      }
      if (typeof skip === 'number') cursor.skip(skip);
      if (typeof take === 'number') cursor.limit(take);
      return cursor.toArray();
    },

    count: async ({ where }: { where?: any } = {}) => {
      const coll = await getCollection();
      return coll.countDocuments(toPrismaFilter(where || {}));
    },

    create: async ({ data }: { data: any }) => {
      const coll = await getCollection();
      const now = new Date();
      const doc = {
        ...data,
        id: data.id ?? crypto.randomUUID(),
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };

      // Keep Mongo's _id in sync with id
      (doc as any)._id = doc.id;

      await coll.insertOne(doc);
      return doc;
    },

    update: async ({ where, data }: { where: any; data: any }) => {
      const coll = await getCollection();
      const filter = toPrismaFilter(where);
      const update = {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      };
      await coll.updateOne(filter, update);
      return coll.findOne(filter);
    },

    updateMany: async ({ where, data }: { where: any; data: any }) => {
      const coll = await getCollection();
      const filter = toPrismaFilter(where);
      const update = {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      };
      const result = await coll.updateMany(filter, update);
      return { count: result.modifiedCount };
    },

    delete: async ({ where }: { where: any }) => {
      const coll = await getCollection();
      const filter = toPrismaFilter(where);
      const result = await coll.deleteOne(filter);
      return { count: result.deletedCount };
    },

    deleteMany: async ({ where }: { where: any }) => {
      const coll = await getCollection();
      const filter = toPrismaFilter(where);
      const result = await coll.deleteMany(filter);
      return { count: result.deletedCount };
    },

    groupBy: async ({ by, where, orderBy, _count }: any) => {
      // Support basic groupBy for counting (used in admin dashboard)
      const coll = await getCollection();
      const pipeline: any[] = [];
      if (where) pipeline.push({ $match: toPrismaFilter(where) });

      const groupId: any = {};
      for (const key of by) {
        groupId[key] = `$${key}`;
      }
      const group: any = { _id: groupId };
      if (_count) {
        group.count = { $sum: 1 };
      }
      pipeline.push({ $group: group });

      if (orderBy) {
        const sort: any = {};
        for (const key of Object.keys(orderBy)) {
          sort[key] = orderBy[key].toLowerCase() === 'desc' ? -1 : 1;
        }
        pipeline.push({ $sort: sort });
      }

      return coll.aggregate(pipeline).toArray();
    },
  };
};

const prisma: any = new Proxy(
  {},
  {
    get(_, prop: string) {
      if (prop === '$runCommandRaw') {
        return async (cmd: any) => {
          const client = await mongoClientPromise;
          return client.db().command(cmd);
        };
      }
      if (prop === '$disconnect') {
        return async () => {
          const client = await mongoClientPromise;
          await client.close();
        };
      }
      return createModelProxy(prop);
    },
  }
);

export { prisma };
