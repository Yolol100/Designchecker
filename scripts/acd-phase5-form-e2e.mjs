#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const outDir = path.join('results', 'acd-phase5-form-e2e');
fs.mkdirSync(outDir, { recursive: true });

const target = 'https://acdcleaning.concept-webactueel-7.com';
const businessUrl = `${target}/zakelijke-offerte/`;
const consumerUrl = `${target}/particuliere-wasbeurt/`;
const businessThanks = `${target}/bedankt-zakelijke-offerte/`;
const consumerThanks = `${target}/bedankt-particuliere-wasbeurt/`;

const result = {
  schema_version: 'acd-phase5-form-e2e/1.0',
  target,
  started_at: new Date().toISOString(),
  mailbox: { provider: 'mail.tm', created: false, deleted: false },
  invalid: {},
  business: {},
  consumer: {},
  received_messages: [],
  checks: [],
  status: 'failed'
};

const check = (name, ok, detail = null) => {
  result.checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
};

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url} -> ${response.status}: ${typeof body === 'string' ? body.slice(0, 400) : JSON.stringify(body).slice(0, 400)}`);
  return { response, body };
}

function headerValue(raw, name) {
  const headerBlock = raw.split(/\r?\n\r?\n/, 1)[0] || '';
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, ' ');
  const match = unfolded.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : null;
}

async function createMailbox() {
  const { body: domainsBody } = await jsonFetch('https://api.mail.tm/domains?page=1');
  const domains = domainsBody['hydra:member'] || domainsBody.member || [];
  const domain = domains.find((d) => d.isActive !== false)?.domain;
  if (!domain) throw new Error('No active mail.tm domain available');
  const local = `acdqa${Date.now()}${crypto.randomBytes(3).toString('hex')}`.toLowerCase();
  const address = `${local}@${domain}`;
  const password = crypto.randomBytes(18).toString('base64url');
  const { body: account } = await jsonFetch('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, password })
  });
  const { body: tokenBody } = await jsonFetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, password })
  });
  result.mailbox.created = true;
  result.mailbox.domain = domain;
  result.mailbox.account_id = account.id;
  result.mailbox.address = address;
  return { address, accountId: account.id, token: tokenBody.token };
}

async function deleteMailbox(accountId, token) {
  const response = await fetch(`https://api.mail.tm/accounts/${accountId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` }
  });
  result.mailbox.deleted = response.status === 204;
}

async function pollMessages(token, expectedSubjects) {
  const deadline = Date.now() + 90000;
  let items = [];
  while (Date.now() < deadline) {
    const { body } = await jsonFetch('https://api.mail.tm/messages?page=1', {
      headers: { authorization: `Bearer ${token}` }
    });
    items = body['hydra:member'] || body.member || [];
    const subjects = new Set(items.map((m) => m.subject));
    if (expectedSubjects.every((s) => subjects.has(s))) break;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return items;
}

async function getRawMessage(token, id) {
  const response = await fetch(`https://api.mail.tm/messages/${id}/download`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  return await response.text();
}

async function fillByName(page, id, value) {
  const locator = page.locator(`[name="form_fields[${id}]"]`);
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.fill(value);
}

async function selectByLabel(page, id, label) {
  const locator = page.locator(`[name="form_fields[${id}]"]`);
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.selectOption({ label });
}

async function submitAndCapture(page, expectedUrl) {
  const ajaxPromise = page.waitForResponse(
    (r) => r.url().includes('/wp-admin/admin-ajax.php') && r.request().method() === 'POST',
    { timeout: 30000 }
  ).catch(() => null);
  const urlPromise = page.waitForURL(expectedUrl, { timeout: 30000 }).catch(() => null);
  await page.locator('form.elementor-form button[type="submit"]').click();
  const ajax = await ajaxPromise;
  await urlPromise;
  let ajaxJson = null;
  let ajaxText = null;
  if (ajax) {
    try { ajaxJson = await ajax.json(); } catch { try { ajaxText = await ajax.text(); } catch {} }
  }
  return {
    final_url: page.url(),
    redirected: page.url() === expectedUrl,
    ajax_status: ajax?.status() || null,
    ajax_json: ajaxJson,
    ajax_text: ajaxText ? ajaxText.slice(0, 2000) : null,
    visible_error: await page.locator('.elementor-message-danger, .elementor-error').allInnerTexts().catch(() => [])
  };
}

let browser;
let mailbox;
try {
  mailbox = await createMailbox();
  check('temporary mailbox created', result.mailbox.created, result.mailbox.address);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.goto(businessUrl, { waitUntil: 'networkidle', timeout: 45000 });
  const businessForm = page.locator('form.elementor-form');
  await businessForm.waitFor({ state: 'visible', timeout: 20000 });
  const nativeValid = await businessForm.evaluate((form) => form.checkValidity());
  await businessForm.evaluate((form) => { form.noValidate = true; });
  const invalidAjaxPromise = page.waitForResponse(
    (r) => r.url().includes('/wp-admin/admin-ajax.php') && r.request().method() === 'POST',
    { timeout: 20000 }
  ).catch(() => null);
  await businessForm.locator('button[type="submit"]').click();
  const invalidAjax = await invalidAjaxPromise;
  await page.waitForTimeout(1500);
  let invalidJson = null;
  if (invalidAjax) { try { invalidJson = await invalidAjax.json(); } catch {} }
  result.invalid = {
    native_valid_before_submit: nativeValid,
    ajax_status: invalidAjax?.status() || null,
    ajax_json: invalidJson,
    final_url: page.url(),
    error_messages: await page.locator('.elementor-message-danger, .elementor-error').allInnerTexts().catch(() => [])
  };
  await page.screenshot({ path: path.join(outDir, 'invalid-required-fields.png'), fullPage: true });
  check('empty business form is invalid', nativeValid === false);
  check('invalid submit stays on form page', page.url() === businessUrl, page.url());
  check('invalid submit is rejected', invalidJson?.success === false || result.invalid.error_messages.length > 0, JSON.stringify(invalidJson));

  await page.goto(businessUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await fillByName(page, 'bedrijfsnaam', 'Webactueel QA TEST');
  await fillByName(page, 'contactpersoon', 'Webactueel QA TEST - geen opvolging');
  await fillByName(page, 'email', mailbox.address);
  await fillByName(page, 'telefoonnummer', '0612345678');
  await selectByLabel(page, 'dienst', 'Autoreconditionering');
  await selectByLabel(page, 'voertuigen', '1–10');
  await fillByName(page, 'toelichting', 'TESTINZENDING Webactueel QA fase 5 - geen opvolging nodig.');
  result.business = await submitAndCapture(page, businessThanks);
  await page.screenshot({ path: path.join(outDir, 'business-thank-you.png'), fullPage: true });
  check('business form redirects to thank-you page', result.business.redirected, result.business.final_url);
  check('business AJAX succeeds', result.business.ajax_json?.success === true, JSON.stringify(result.business.ajax_json));

  await page.goto(consumerUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await fillByName(page, 'naam', 'Webactueel QA TEST - geen opvolging');
  await fillByName(page, 'email', mailbox.address);
  await fillByName(page, 'telefoonnummer', '0612345678');
  await selectByLabel(page, 'behandeling', 'Exterieurbehandeling');
  await selectByLabel(page, 'voorkeurslocatie', 'Krimpen aan den IJssel');
  await selectByLabel(page, 'voorkeursmoment', 'Geen voorkeur');
  await fillByName(page, 'bijzonderheden', 'TESTINZENDING Webactueel QA fase 5 - geen opvolging nodig.');
  result.consumer = await submitAndCapture(page, consumerThanks);
  await page.screenshot({ path: path.join(outDir, 'consumer-thank-you.png'), fullPage: true });
  check('consumer form redirects to thank-you page', result.consumer.redirected, result.consumer.final_url);
  check('consumer AJAX succeeds', result.consumer.ajax_json?.success === true, JSON.stringify(result.consumer.ajax_json));

  const expectedSubjects = [
    'We hebben je zakelijke offerteaanvraag ontvangen',
    'We hebben je aanvraag ontvangen'
  ];
  const messages = await pollMessages(mailbox.token, expectedSubjects);
  for (const subject of expectedSubjects) {
    const message = messages.find((m) => m.subject === subject);
    check(`customer confirmation received: ${subject}`, Boolean(message), `received=${messages.map((m) => m.subject).join(' | ')}`);
    const { body: detail } = await jsonFetch(`https://api.mail.tm/messages/${message.id}`, {
      headers: { authorization: `Bearer ${mailbox.token}` }
    });
    const raw = await getRawMessage(mailbox.token, message.id);
    const evidence = {
      id: message.id,
      subject: message.subject,
      from: message.from,
      to: message.to,
      createdAt: message.createdAt,
      verifications: detail.verifications || [],
      text_intro: typeof detail.text === 'string' ? detail.text.slice(0, 500) : null,
      headers: raw ? {
        authentication_results: headerValue(raw, 'Authentication-Results'),
        received_spf: headerValue(raw, 'Received-SPF'),
        dkim_signature: headerValue(raw, 'DKIM-Signature'),
        from: headerValue(raw, 'From'),
        return_path: headerValue(raw, 'Return-Path'),
        message_id: headerValue(raw, 'Message-ID'),
        date: headerValue(raw, 'Date'),
        content_type: headerValue(raw, 'Content-Type')
      } : null
    };
    result.received_messages.push(evidence);
    check(`confirmation sender is info@acdcleaning.nl: ${subject}`, message.from?.address === 'info@acdcleaning.nl', message.from?.address || null);
  }

  result.status = 'success';
  await context.close();
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (mailbox?.accountId && mailbox?.token) await deleteMailbox(mailbox.accountId, mailbox.token).catch(() => {});
  result.completed_at = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify({ status: result.status, checks: result.checks, mailbox_deleted: result.mailbox.deleted }, null, 2));
if (result.status !== 'success') process.exit(1);
