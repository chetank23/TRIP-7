#!/usr/bin/env node
import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });

if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
  throw new Error('Unable to export a P-256 VAPID key pair.');
}

const publicKeyBytes = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x, 'base64url'),
  Buffer.from(publicJwk.y, 'base64url'),
]);

const values = {
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: publicKeyBytes.toString('base64url'),
  WEB_PUSH_VAPID_PRIVATE_KEY: privateJwk.d,
  WEB_PUSH_VAPID_SUBJECT: 'https://trip-7.vercel.app',
  CRON_SECRET: randomBytes(32).toString('base64url'),
};

console.log('\nBVC Trip Web Push environment variables\n');
for (const [name, value] of Object.entries(values)) {
  console.log(`${name}=${value}`);
}
console.log('\nIMPORTANT: Keep WEB_PUSH_VAPID_PRIVATE_KEY and CRON_SECRET secret.');
console.log('Add these values to Vercel Project Settings → Environment Variables.');
console.log('Do not commit the generated values to GitHub or share them in screenshots.');
console.log('Generate this key pair only once. Replacing it later invalidates existing device subscriptions.\n');
