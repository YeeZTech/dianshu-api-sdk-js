const { crypto } = require('..');

async function run() {
  console.log('Running basic crypto self-test (node fallback or libspec if installed)');
  console.log('implementation:', crypto._impl || 'unknown');
  const secret = 'test-secret';
  const plain = 'hello dianshu';
  try {
    const enc = await crypto.encrypt(plain, secret);
    const dec = await crypto.decrypt(enc, secret);
    if (dec !== plain) {
      console.error('FAIL: decrypted value does not match');
      process.exit(1);
    }
    console.log('OK: roundtrip success');
    console.log('cipher sample:', enc.data && enc.data.slice(0, 60) + '...');
    process.exit(0);
  } catch (e) {
    console.error('ERROR during self-test:', e);
    process.exit(2);
  }
}

run();
