import { EventEmitter } from 'node:events';

export interface DomainEventMap {
  'video.liked': { videoId: string; actorId: string; ownerId: string };
  'video.commented': {
    videoId: string;
    commentId: string;
    actorId: string;
    ownerId: string;
    parentId: string | null;
  };
  'user.followed': { followerId: string; followingId: string };
  'comment.liked': { commentId: string; actorId: string; ownerId: string };
  'comment.replied': {
    videoId: string;
    commentId: string;
    parentCommentId: string;
    actorId: string;
    recipientId: string;
  };
}

export type DomainEventName = keyof DomainEventMap;

type Listener<K extends DomainEventName> = (payload: DomainEventMap[K]) => void;

export class DomainEventBus {
  private readonly emitter = new EventEmitter();

  emit<K extends DomainEventName>(name: K, payload: DomainEventMap[K]): void {
    this.emitter.emit(name, payload);
  }

  on<K extends DomainEventName>(name: K, listener: Listener<K>): () => void {
    this.emitter.on(name, listener);
    return () => this.emitter.off(name, listener);
  }
}
