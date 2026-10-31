import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  hkdfSync,
  randomBytes,
  sign,
} from 'crypto';

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushDeliveryResult {
  expired: boolean;
  status: number;
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function encodeBase64Url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;

    const host = url.hostname.toLowerCase();
    return (
      host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host === 'push.services.mozilla.com' ||
      host.endsWith('.push.apple.com') ||
      host.endsWith('.notify.windows.com')
    );
  } catch {
    return false;
  }
}

export function getWebPushPublicKey(): string {
  return process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || '';
}

function getVapidMaterial() {
  const publicKeyText = getWebPushPublicKey();
  const privateKeyText = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() || '';
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim() || '';

  if (!publicKeyText || !privateKeyText || !subject) {
    throw new Error(
      'Web Push is not configured. Set NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY and WEB_PUSH_VAPID_SUBJECT.'
    );
  }

  const publicKey = decodeBase64Url(publicKeyText);
  const privateKey = decodeBase64Url(privateKeyText);

  if (publicKey.length !== 65 || privateKey.length !== 32) {
    throw new Error('The Web Push VAPID key pair has an invalid format.');
  }

  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(privateKey);
  const derivedPublicKey = ecdh.getPublicKey(undefined, 'uncompressed');

  if (!derivedPublicKey.equals(publicKey)) {
    throw new Error('The Web Push public and private VAPID keys do not match.');
  }

  const privateJwk = {
    kty: 'EC',
    crv: 'P-256',
    d: encodeBase64Url(privateKey),
    x: encodeBase64Url(publicKey.subarray(1, 33)),
    y: encodeBase64Url(publicKey.subarray(33, 65)),
  };

  return {
    publicKeyText,
    publicKey,
    subject,
    privateKeyObject: createPrivateKey({ key: privateJwk, format: 'jwk' }),
  };
}

export function assertWebPushConfigured(): void {
  getVapidMaterial();
}

function createVapidAuthorization(audience: string): string {
  const vapid = getVapidMaterial();
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = encodeBase64Url(
    Buffer.from(
      JSON.stringify({
        aud: audience,
        exp: now + 12 * 60 * 60,
        sub: vapid.subject,
      })
    )
  );
  const unsignedToken = `${header}.${claims}`;
  const signature = sign('sha256', Buffer.from(unsignedToken), {
    key: vapid.privateKeyObject,
    dsaEncoding: 'ieee-p1363',
  });

  return `vapid t=${unsignedToken}.${encodeBase64Url(signature)}, k=${vapid.publicKeyText}`;
}

/**
 * Encrypts one Web Push payload using RFC 8291 aes128gcm content encoding,
 * then authenticates the request with an ES256 VAPID token (RFC 8292).
 * Uses Node's built-in crypto so no additional runtime package is required.
 */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: PushNotificationPayload
): Promise<PushDeliveryResult> {
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    throw new Error('Push endpoint host is not an approved browser push service.');
  }

  const clientPublicKey = decodeBase64Url(subscription.keys.p256dh);
  const authSecret = decodeBase64Url(subscription.keys.auth);

  if (clientPublicKey.length !== 65 || authSecret.length < 16) {
    throw new Error('The stored push subscription keys are invalid.');
  }

  const serverEcdh = createECDH('prime256v1');
  serverEcdh.generateKeys();
  const serverPublicKey = serverEcdh.getPublicKey(undefined, 'uncompressed');
  const sharedSecret = serverEcdh.computeSecret(clientPublicKey);

  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'utf8'),
    clientPublicKey,
    serverPublicKey,
  ]);
  const inputKeyMaterial = Buffer.from(
    hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32)
  );

  const salt = randomBytes(16);
  const contentKey = Buffer.from(
    hkdfSync(
      'sha256',
      inputKeyMaterial,
      salt,
      Buffer.from('Content-Encoding: aes128gcm\0', 'utf8'),
      16
    )
  );
  const nonce = Buffer.from(
    hkdfSync(
      'sha256',
      inputKeyMaterial,
      salt,
      Buffer.from('Content-Encoding: nonce\0', 'utf8'),
      12
    )
  );

  const plaintext = Buffer.concat([
    Buffer.from(JSON.stringify(payload), 'utf8'),
    Buffer.from([0x02]),
  ]);
  const cipher = createCipheriv('aes-128-gcm', contentKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const recordHeader = Buffer.alloc(5);
  recordHeader.writeUInt32BE(4096, 0);
  recordHeader.writeUInt8(serverPublicKey.length, 4);
  const body = Buffer.concat([salt, recordHeader, serverPublicKey, ciphertext]);

  const endpoint = new URL(subscription.endpoint);
  const authorization = createVapidAuthorization(endpoint.origin);
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  });

  if (response.status === 404 || response.status === 410) {
    return { expired: true, status: response.status };
  }

  if (!response.ok) {
    throw new Error(`Push service returned HTTP ${response.status}.`);
  }

  return { expired: false, status: response.status };
}
