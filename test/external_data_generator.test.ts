import {TiktokBusinessExternalDataGenerator} from '../src/crypto';
// test data that does not include app_id and redirect_uri
import data from '../test-jsons/test.json';
import {shallowEqualObjects} from 'shallow-equal';

const key = "TEST_KEY"
const generator = new TiktokBusinessExternalDataGenerator(key, {});

const veryShortTimeoutGenerator = new TiktokBusinessExternalDataGenerator(key, {
  level2: false,
  level3: false,
  // any external_data generated by this generate will invalidate after 0.1 second
  validationLength: 100,
});

// can encode and decode
test('Normal case', async () => {
  const {body, external_data} = await generator.encode({
    ...data,
    timestamp: "" + Date.now(),
  });

  const payload = await generator.decodeAndVerify(external_data);
  expect(shallowEqualObjects(payload, body)).toBe(true);
});

// base 64 is tampered with
test('Tampered with case', async () => {
  let {external_data} = await generator.encode({
    ...data,
    timestamp: "" + Date.now(),
  });

  external_data = "==a21321a" + external_data;
  expect(async () => {
    await generator.decodeAndVerify(external_data);
  }).rejects.toThrow("Failed to parse external_data");
});


test('timeout case', async () => {
  const {external_data} = await veryShortTimeoutGenerator.encode({
    ...data,
    timestamp: "" + Date.now(),
  });

  setTimeout(() => {
    expect(async () => {
      await veryShortTimeoutGenerator.decodeAndVerify(external_data);
    }).rejects.toThrow('external_data is outdated');
  }, 500);
});

