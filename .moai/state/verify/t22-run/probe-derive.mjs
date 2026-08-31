// deriveBotKeys 실측 — routes-bots.ts 에서 추출한 상수(derive-constants.txt)로 유도를 검증한다
import { readFileSync } from 'node:fs'
import { createHmac, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'

const txt = readFileSync(new URL('./derive-constants.txt', import.meta.url), 'utf8')
const grab = name => { const m = txt.match(new RegExp(`const ${name} = '([^']*)'`)); if (!m) throw new Error(name + ' not found'); return m[1] }
const SIGN_LABEL = grab('SIGN_LABEL')
const CONFIRM_LABEL = grab('CONFIRM_LABEL')
const PKCS8_ED25519_PREFIX = grab('PKCS8_ED25519_PREFIX')

const derive = t => {
  const seed = createHmac('sha256', t).update(SIGN_LABEL).digest()
  const sk = createPrivateKey({ key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, 'hex'), seed]), format: 'der', type: 'pkcs8' })
  return {
    pub: createPublicKey(sk).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex'),
    ksrv: createHmac('sha256', t).update(CONFIRM_LABEL).digest('hex'),
  }
}

const a = derive('tok'), b = derive('tok'), d = derive('other')
console.log('pub len:', a.pub.length, '/^[0-9a-f]{64}$/:', /^[0-9a-f]{64}$/.test(a.pub))
console.log('deterministic (same token twice):', a.pub === b.pub && a.ksrv === b.ksrv)
console.log('token-bound (other token differs):', a.pub !== d.pub && a.ksrv !== d.ksrv)
console.log('ksrv len:', a.ksrv.length, 'ksrv differs from pub:', a.ksrv !== a.pub)
const sig = Buffer.from('probe message')
const sk = createPrivateKey({ key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, 'hex'), createHmac('sha256', 'tok').update(SIGN_LABEL).digest()]), format: 'der', type: 'pkcs8' })
const sigHex = sign(null, sig, sk).toString('hex')
const spkiPrefix = '302a300506032b6570032100'
const verifyKey = createPublicKey({ key: Buffer.concat([Buffer.from(spkiPrefix, 'hex'), Buffer.from(a.pub, 'hex')]), format: 'der', type: 'spki' })
console.log('signature round-trip (64B hex, verifies):', sigHex.length === 128, verify(null, sig, verifyKey, Buffer.from(sigHex, 'hex')))
console.log('tampered message rejected:', !verify(null, Buffer.from('probe messagX'), verifyKey, Buffer.from(sigHex, 'hex')))
