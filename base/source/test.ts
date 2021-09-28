import { getNewId } from './database';
import { LocalMessageBusProvider } from './message-bus/local';
import { benchmarkAsync } from './utils';

void test();

async function test(): Promise<void> {
  const provider = new LocalMessageBusProvider();

  const bus1 = provider.get('test');
  const bus2 = provider.get('test');

  bus1.messages$.subscribe((message) => Function.prototype(message));

  await benchmarkAsync(100000, async () => bus2.publish('foobar'));

  console.log(await benchmarkAsync(100000, async () => bus2.publish('foobar')));

  setInterval(() => { provider.get(getNewId()) }, 1);
}
