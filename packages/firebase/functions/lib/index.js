"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSmsIntake = exports.sendSms = exports.smsGatewayInbound = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const gatewayWebhookSecret = (0, params_1.defineSecret)('SMS_GATEWAY_WEBHOOK_SECRET');
const gatewayUsername = (0, params_1.defineSecret)('SMS_GATEWAY_USERNAME');
const gatewayPassword = (0, params_1.defineSecret)('SMS_GATEWAY_PASSWORD');
const gatewayBaseUrl = (0, params_1.defineSecret)('SMS_GATEWAY_BASE_URL');
function normalizePhone(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (/^9\d{9}$/.test(digits))
        return `+63${digits}`;
    if (/^09\d{9}$/.test(digits))
        return `+63${digits.slice(1)}`;
    if (/^639\d{9}$/.test(digits))
        return `+${digits}`;
    return null;
}
function stableId(value) {
    return node_crypto_1.default.createHash('sha256').update(value).digest('hex');
}
async function assertDispatcher(request) {
    const authorization = request.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer '))
        throw new https_1.HttpsError('unauthenticated', 'A Firebase session is required.');
    const token = await (0, auth_1.getAuth)().verifyIdToken(authorization.slice(7));
    const [dispatcher, commandCenter] = await Promise.all([
        db.doc(`dispatchers/${token.uid}`).get(),
        db.doc(`commandCenters/${token.uid}`).get(),
    ]);
    if (!dispatcher.exists && !commandCenter.exists)
        throw new https_1.HttpsError('permission-denied', 'Dispatcher access is required.');
    return token;
}
exports.smsGatewayInbound = (0, https_1.onRequest)({ region: 'asia-southeast1', secrets: [gatewayWebhookSecret] }, async (request, response) => {
    const receivedToken = Array.isArray(request.query.token) ? request.query.token[0] : request.query.token;
    const expectedToken = gatewayWebhookSecret.value().trim();
    if (request.method !== 'POST' || String(receivedToken ?? '').trim() !== expectedToken) {
        response.status(401).send('Unauthorized');
        return;
    }
    const event = request.body;
    if (event.event !== 'sms:received' || !event.payload?.messageId) {
        response.status(204).end();
        return;
    }
    const phoneNumber = normalizePhone(event.payload.phoneNumber);
    const body = event.payload.message?.trim();
    if (!phoneNumber || !body) {
        response.status(400).send('Invalid SMS payload');
        return;
    }
    const threadId = stableId(phoneNumber);
    const messageId = stableId(`gateway:${event.payload.messageId}`);
    const messageRef = db.doc(`smsMessages/${messageId}`);
    const threadRef = db.doc(`smsThreads/${threadId}`);
    const intakeRef = db.doc(`smsIntakes/${threadId}`);
    await db.runTransaction(async (transaction) => {
        if ((await transaction.get(messageRef)).exists)
            return;
        transaction.set(messageRef, {
            threadId, direction: 'inbound', body, phoneNumber, gatewayMessageId: event.payload.messageId,
            gatewayDeviceSim: event.payload.simNumber ?? null, status: 'received',
            gatewayReceivedAt: event.payload.receivedAt ?? null, createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        transaction.set(threadRef, {
            phoneNumber, preview: body, lastMessageAt: firestore_1.FieldValue.serverTimestamp(), lastDirection: 'inbound',
            unreadCount: firestore_1.FieldValue.increment(1), updatedAt: firestore_1.FieldValue.serverTimestamp(), createdAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.set(intakeRef, {
            threadId, phoneNumber, latestMessage: body, status: 'untriaged', source: 'sms',
            updatedAt: firestore_1.FieldValue.serverTimestamp(), createdAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    response.status(204).end();
});
exports.sendSms = (0, https_1.onRequest)({ region: 'asia-southeast1', secrets: [gatewayUsername, gatewayPassword, gatewayBaseUrl] }, async (request, response) => {
    if (request.method !== 'POST')
        return response.status(405).send('Method not allowed');
    try {
        const dispatcher = await assertDispatcher(request);
        const phoneNumber = normalizePhone(request.body?.phoneNumber);
        const body = typeof request.body?.body === 'string' ? request.body.body.trim() : '';
        const threadId = typeof request.body?.threadId === 'string' ? request.body.threadId : null;
        if (!phoneNumber || !threadId || !body || body.length > 480)
            return response.status(400).send('Invalid message.');
        const outgoingRef = db.collection('smsMessages').doc();
        await outgoingRef.set({ threadId, phoneNumber, body, direction: 'outbound', status: 'queued', dispatcherId: dispatcher.uid, createdAt: firestore_1.FieldValue.serverTimestamp() });
        const gatewayResponse = await fetch(`${gatewayBaseUrl.value().replace(/\/$/, '')}/messages`, {
            method: 'POST', headers: {
                authorization: `Basic ${Buffer.from(`${gatewayUsername.value()}:${gatewayPassword.value()}`).toString('base64')}`,
                'content-type': 'application/json',
            }, body: JSON.stringify({ phoneNumbers: [phoneNumber], textMessage: { text: body } }),
        });
        const gatewayPayload = await gatewayResponse.json().catch(() => null);
        if (!gatewayResponse.ok)
            throw new Error('Gateway rejected the message.');
        await Promise.all([
            outgoingRef.update({ status: 'sent', gatewayMessageId: gatewayPayload?.id ?? null, sentAt: firestore_1.FieldValue.serverTimestamp() }),
            db.doc(`smsThreads/${threadId}`).set({ preview: body, lastMessageAt: firestore_1.FieldValue.serverTimestamp(), lastDirection: 'outbound', updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true }),
        ]);
        response.status(201).json({ id: outgoingRef.id });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to send SMS.';
        response.status(error instanceof https_1.HttpsError ? 401 : 500).json({ error: message });
    }
});
exports.updateSmsIntake = (0, https_1.onRequest)({ region: 'asia-southeast1' }, async (request, response) => {
    if (request.method !== 'POST')
        return response.status(405).send('Method not allowed');
    try {
        const dispatcher = await assertDispatcher(request);
        const threadId = typeof request.body?.threadId === 'string' ? request.body.threadId : '';
        const status = request.body?.status;
        if (!threadId || !['untriaged', 'triaged', 'closed'].includes(status)) {
            return response.status(400).send('Invalid intake update.');
        }
        await db.doc(`smsIntakes/${threadId}`).set({
            status,
            triagedBy: dispatcher.uid,
            triagedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        response.status(204).end();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update SMS intake.';
        response.status(error instanceof https_1.HttpsError ? 401 : 500).json({ error: message });
    }
});
