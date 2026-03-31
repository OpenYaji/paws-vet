import HttpSms from 'httpsms';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.HTTPSMS_API_KEY || '';
const DEFAULT_FROM_NUMBER = process.env.HTTPSMS_FROM_NUMBER || '';

if (!API_KEY) console.warn('[HttpSms] HTTPSMS_API_KEY is not set. SMS sending will fail with 401.');
if (!DEFAULT_FROM_NUMBER) console.warn('[HttpSms] HTTPSMS_FROM_NUMBER is not set. Calls using the default sender will fail.');

const httpSmsClient = new HttpSms(API_KEY);

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export async function sendSmsByName(clientName: string, message: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();

    // split the name
    const fullName = clientName.trim().split(/\s+/);
    const firstName = fullName[0];
    const lastName = fullName.slice(1).join(' ');

    // use let query to build first
    let query = supabase
        .from('client_profiles')
        .select('phone, first_name, last_name')
        .eq('first_name', firstName);

    if (lastName) {
        query = query.ilike('last_name', lastName);
    }

    const { data: clients, error } = await query;

    if (error) {
        console.error(`[HttpSms] database error searching for ${clientName}:`, error.message);
        return false;
    }

    if (!clients || clients.length === 0) {
        console.error(`[HttpSms] could not find any client named "${clientName}".`);
        return false;
    }

    // prevent texting the wrong person if duplicates exist
    if (clients.length > 1) {
        console.error(`[HttpSms] found multiple clients named "${clientName}". please use an ID instead.`);
        return false;
    }

    const client = clients[0];

    if (!client.phone) {
        console.error(`[HttpSms] client ${client.first_name} ${client.last_name} has no phone number.`);
        return false;
    }

    // dispatch using the original function you already wrote
    return dispatch(client.phone, DEFAULT_FROM_NUMBER, message);
}

async function dispatch(to: string, from: string, content: string): Promise<boolean> {
    if (!to) { console.error('[HttpSms] Missing "to" phone number.'); return false; }
    if (!from) { console.error('[HttpSms] Missing "from" phone number. Set HTTPSMS_FROM_NUMBER in your .env file.'); return false; }
    if (!content) { console.error('[HttpSms] Missing message content.'); return false; }

    try {
        const response = await httpSmsClient.messages.postSend({
            content,
            from,
            to,
            encrypted: false,
        });

        console.log(`[HttpSms] SMS sent to ${to}. Message ID: ${response.id}`);
        return true;
    } catch (error: any) {
        console.error(`[HttpSms] Failed to send SMS to ${to}:`, error?.message || error);
        return false;
    }
}

/**
 * Send an SMS to a client by their client_profiles.id.
 * Fetches the client's phone number automatically.
 */
export async function sendSmsToClient(clientProfileId: string, message: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();

    const { data: client, error } = await supabase
        .from('client_profiles')
        .select('phone, first_name, last_name')
        .eq('id', clientProfileId)
        .single();

    if (error || !client) {
        console.error(`[HttpSms] Could not fetch client profile ${clientProfileId}:`, error?.message);
        return false;
    }

    if (!client.phone) {
        console.error(`[HttpSms] Client ${client.first_name} ${client.last_name} has no phone number.`);
        return false;
    }

    return dispatch(client.phone, DEFAULT_FROM_NUMBER, message);
}

/**
 * Send an SMS from a specific vet to a client.
 * Both phone numbers are fetched automatically from their respective profiles.
 * @param vetProfileId    - veterinarian_profiles.id of the sending vet
 * @param clientProfileId - client_profiles.id of the recipient
 */
export async function sendSmsFromVet(
    vetProfileId: string,
    clientProfileId: string,
    message: string
): Promise<boolean> {
    const supabase = getSupabaseAdmin();

    const [vetResult, clientResult] = await Promise.all([
        supabase
            .from('veterinarian_profiles')
            .select('phone, first_name, last_name')
            .eq('id', vetProfileId)
            .single(),
        supabase
            .from('client_profiles')
            .select('phone, first_name, last_name')
            .eq('id', clientProfileId)
            .single(),
    ]);

    if (vetResult.error || !vetResult.data) {
        console.error(`[HttpSms] Could not fetch vet profile ${vetProfileId}:`, vetResult.error?.message);
        return false;
    }

    if (clientResult.error || !clientResult.data) {
        console.error(`[HttpSms] Could not fetch client profile ${clientProfileId}:`, clientResult.error?.message);
        return false;
    }

    const vet = vetResult.data;
    const client = clientResult.data;

    if (!vet.phone) {
        console.error(`[HttpSms] Vet ${vet.first_name} ${vet.last_name} has no phone number on record.`);
        return false;
    }

    if (!client.phone) {
        console.error(`[HttpSms] Client ${client.first_name} ${client.last_name} has no phone number on record.`);
        return false;
    }

    return dispatch(client.phone, vet.phone, message);
}

export async function sendSms(to: string, message: string): Promise<boolean> {
    return dispatch(to, DEFAULT_FROM_NUMBER, message);
}
