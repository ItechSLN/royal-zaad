import { randomUUID } from 'node:crypto';

export interface InMemoryEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryRepository<
  TEntity extends InMemoryEntity,
  TCreate extends object,
  TUpdate extends object,
> {
  private readonly records = new Map<string, TEntity>();

  findAll(): TEntity[] {
    return [...this.records.values()];
  }

  findById(id: string): TEntity | null {
    return this.records.get(id) ?? null;
  }

  create(data: TCreate): TEntity {
    const now = new Date();
    const entity = {
      ...data,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as unknown as TEntity;
    this.records.set(entity.id, entity);
    return entity;
  }

  update(id: string, data: TUpdate): TEntity | null {
    const entity = this.records.get(id);
    if (!entity) return null;
    const updated = { ...entity, ...data, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  remove(id: string): TEntity | null {
    const entity = this.records.get(id) ?? null;
    this.records.delete(id);
    return entity;
  }
}
