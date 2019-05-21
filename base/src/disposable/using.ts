import { AsyncDisposable, Disposable, dispose, disposeAsync } from './disposable';

export function using<T extends Disposable, U>(disposable: T, user: (disposable: T) => U): U {
  try {
    return user(disposable);
  }
  finally {
    disposable[dispose]();
  }
}

export async function usingAsync<T extends AsyncDisposable, U>(disposable: T, user: (disposable: T) => U | Promise<U>): Promise<U> {
  try {
    return await user(disposable);
  }
  finally {
    await disposable[disposeAsync]();
  }
}
